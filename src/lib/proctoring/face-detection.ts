import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';

/**
 * Camera-intelligence layer for proctoring (Phase 1). A focused BlazeFace face
 * analyzer that runs over a video element the caller already owns — the
 * `useProctoring` controller opens the camera; this only watches it. Detection
 * heuristics (obstruction, off-centre, size, smoothing, warm-up) are ported from
 * the ai-linc engine, minus its camera/stream management.
 *
 * Face-box-centre "looking away" is a known-weak heuristic (it can't see gaze or
 * head-down); Phase 2 augments it with real head-pose. Everything here is
 * client-side and advisory — the server-stamped log is the tamper-resistant record.
 */

export type FaceViolationType =
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'FACE_NOT_VISIBLE'
  | 'LOOKING_AWAY'
  | 'FACE_TOO_CLOSE'
  | 'FACE_TOO_FAR'
  | 'POOR_LIGHTING';

export type FaceStatus = 'NORMAL' | 'WARNING' | 'VIOLATION';

export interface FaceViolation {
  type: FaceViolationType;
  message: string;
  severity: 'low' | 'medium' | 'high';
  confidence?: number;
}

export interface FaceFrameResult {
  faceCount: number;
  violations: FaceViolation[];
  status: FaceStatus;
}

export interface FaceProctorConfig {
  /** How often to run detection (ms). */
  detectionInterval: number;
  /** Min face height as % of frame before "too far". */
  minFaceSize: number;
  /** Max face height as % of frame before "too close". */
  maxFaceSize: number;
  /** How far off-centre (0-1 of frame) before "looking away". */
  lookingAwayThreshold: number;
  /** Ignore face boxes below this raw probability. */
  minConfidence: number;
  /** Frames to smooth face count over (reduces flicker). */
  smoothFrameCount: number;
  /** Probability below which lighting is flagged. */
  poorLightingThreshold: number;
  /** Confidence required to accept a face as unobstructed. */
  minConfidenceForValidFace: number;
  /** Min inter-eye distance / face width before landmarks read as "covered". */
  minEyeSpreadRatio: number;
  /** Suppress spurious NO_FACE for this long after start (camera/model warm-up). */
  startupWarmupMs: number;
}

export const DEFAULT_FACE_CONFIG: FaceProctorConfig = {
  detectionInterval: 800,
  minFaceSize: 20,
  maxFaceSize: 75,
  lookingAwayThreshold: 0.3,
  minConfidence: 0.4,
  smoothFrameCount: 3,
  poorLightingThreshold: 0.4,
  minConfidenceForValidFace: 0.78,
  minEyeSpreadRatio: 0.22,
  startupWarmupMs: 5500,
};

export interface FaceProctorCallbacks {
  onFrame?: (result: FaceFrameResult) => void;
}

type Point = [number, number];

/** BlazeFace landmarks/probability come back loosely typed (array or tensor). */
function readPair(value: unknown): Point | null {
  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
  }
  const tensorLike = value as { dataSync?: () => ArrayLike<number> };
  const data = tensorLike?.dataSync?.();
  if (data && data.length >= 2) {
    const x = Number(data[0]);
    const y = Number(data[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) return [x, y];
  }
  return null;
}

function readProbability(face: blazeface.NormalizedFace): number | undefined {
  const p: unknown = (face as { probability?: unknown }).probability;
  if (p == null) return undefined;
  if (typeof p === 'number') return p;
  if (Array.isArray(p) && p.length > 0) return Number(p[0]);
  const data = (p as { dataSync?: () => ArrayLike<number> }).dataSync?.();
  if (data && data.length > 0) return Number(data[0]);
  return undefined;
}

let modelPromise: Promise<blazeface.BlazeFaceModel> | null = null;

/** Load BlazeFace once, preferring WebGL and falling back to CPU on locked-down GPUs. */
async function loadModel(): Promise<blazeface.BlazeFaceModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
      } catch {
        await tf.setBackend('cpu');
        await tf.ready();
      }
      return blazeface.load();
    })().catch((err) => {
      modelPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return modelPromise;
}

export class FaceProctor {
  private config: FaceProctorConfig;
  private model: blazeface.BlazeFaceModel | null = null;
  private video: HTMLVideoElement | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private callbacks: FaceProctorCallbacks = {};
  private faceCountBuffer: number[] = [];
  private warmupUntil = 0;

  constructor(config: Partial<FaceProctorConfig> = {}) {
    this.config = { ...DEFAULT_FACE_CONFIG, ...config };
  }

  /** Preload the model (e.g. during the device check) so the exam starts warm. */
  async preload(): Promise<void> {
    this.model = await loadModel();
  }

  /** Begin analyzing an already-playing video element. Safe to call repeatedly. */
  async start(video: HTMLVideoElement, callbacks: FaceProctorCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.video = video;
    this.model = await loadModel();
    if (this.running) return;
    this.running = true;
    this.warmupUntil = Date.now() + this.config.startupWarmupMs;
    this.timer = setInterval(() => void this.tick(), this.config.detectionInterval);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.video = null;
    this.faceCountBuffer = [];
    this.warmupUntil = 0;
  }

  /** JPEG data URL of the current frame, for a violation snapshot. */
  snapshot(quality = 0.8): string | null {
    const v = this.video;
    if (!v || !v.videoWidth || !v.videoHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0);
    return canvas.toDataURL('image/jpeg', quality);
  }

  private async tick(): Promise<void> {
    const v = this.video;
    if (!this.running || !v || !this.model) return;
    if (!v.videoWidth || !v.videoHeight || v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }
    try {
      const result = this.suppressWarmupNoFace(await this.analyze(v));
      this.callbacks.onFrame?.(result);
    } catch {
      // WebGL/model warm-up glitches are common on first frames — never map to NO_FACE.
    }
  }

  private async analyze(video: HTMLVideoElement): Promise<FaceFrameResult> {
    const model = this.model;
    if (!model) throw new Error('model not loaded');

    const raw = await model.estimateFaces(video, false);
    const predictions = raw.filter((f) => {
      const p = readProbability(f);
      return typeof p === 'number' && p >= this.config.minConfidence;
    });

    const rawCount = predictions.length;
    const faceCount = this.smoothFaceCount(rawCount);
    const bufferReady = this.faceCountBuffer.length >= this.config.smoothFrameCount;
    const violations: FaceViolation[] = [];

    if (faceCount === 0 && bufferReady) {
      violations.push(v('NO_FACE', 'No face detected', 'high'));
    } else if (faceCount > 1) {
      violations.push(v('MULTIPLE_FACES', `${faceCount} faces detected`, 'high'));
    } else if (predictions.length >= 1) {
      violations.push(...this.inspectSingleFace(predictions[0], video));
    }

    return { faceCount, violations, status: statusOf(violations) };
  }

  private inspectSingleFace(
    face: blazeface.NormalizedFace,
    video: HTMLVideoElement,
  ): FaceViolation[] {
    const out: FaceViolation[] = [];
    const topLeft = readPair(face.topLeft);
    const bottomRight = readPair(face.bottomRight);
    if (!topLeft || !bottomRight) return out;

    const faceWidth = bottomRight[0] - topLeft[0];
    const faceHeight = bottomRight[1] - topLeft[1];
    const faceSizePct = (faceHeight / video.videoHeight) * 100;
    const probability = readProbability(face);
    const obstructedMsg = 'Face not clearly visible. Remove hands or obstructions.';

    // Obstruction: low confidence OR collapsed/absent eye landmarks (a hand reads
    // as a face box but with no valid eye spread).
    if (typeof probability === 'number' && probability < this.config.minConfidenceForValidFace) {
      out.push(v('FACE_NOT_VISIBLE', obstructedMsg, 'high', probability));
    }
    const landmarks = (face as { landmarks?: unknown }).landmarks;
    const rightEye = Array.isArray(landmarks) ? readPair(landmarks[0]) : null;
    const leftEye = Array.isArray(landmarks) ? readPair(landmarks[1]) : null;
    if (faceWidth > 0 && rightEye && leftEye) {
      const eyeDistance = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
      if (eyeDistance / faceWidth < this.config.minEyeSpreadRatio) {
        out.push(v('FACE_NOT_VISIBLE', obstructedMsg, 'high'));
      }
    } else {
      out.push(v('FACE_NOT_VISIBLE', obstructedMsg, 'high'));
    }

    if (faceSizePct < this.config.minFaceSize) {
      out.push(v('FACE_TOO_FAR', 'Please move closer to the camera', 'medium'));
    } else if (faceSizePct > this.config.maxFaceSize) {
      out.push(v('FACE_TOO_CLOSE', 'Please move away from the camera', 'medium'));
    }

    const faceCenterX = (topLeft[0] + bottomRight[0]) / 2;
    const faceCenterY = (topLeft[1] + bottomRight[1]) / 2;
    const hOffset = Math.abs(faceCenterX - video.videoWidth / 2) / video.videoWidth;
    const vOffset = Math.abs(faceCenterY - video.videoHeight / 2) / video.videoHeight;
    if (hOffset > this.config.lookingAwayThreshold || vOffset > this.config.lookingAwayThreshold) {
      out.push(v('LOOKING_AWAY', 'Please look at the screen', 'medium'));
    }

    if (typeof probability === 'number' && probability < this.config.poorLightingThreshold) {
      out.push(v('POOR_LIGHTING', 'Poor lighting detected', 'low', probability));
    }
    return out;
  }

  /** Mode over the last N frames — kills 0/1/0/1 flicker on noisy webcams. */
  private smoothFaceCount(rawCount: number): number {
    const n = this.config.smoothFrameCount;
    this.faceCountBuffer.push(rawCount);
    if (this.faceCountBuffer.length > n) this.faceCountBuffer.shift();
    if (this.faceCountBuffer.length < n) return rawCount;
    const freq = new Map<number, number>();
    for (const c of this.faceCountBuffer) freq.set(c, (freq.get(c) ?? 0) + 1);
    let best = rawCount;
    let bestFreq = 0;
    freq.forEach((f, c) => {
      if (f > bestFreq || (f === bestFreq && c === 1)) {
        bestFreq = f;
        best = c;
      }
    });
    return best;
  }

  private suppressWarmupNoFace(result: FaceFrameResult): FaceFrameResult {
    if (!this.warmupUntil || Date.now() >= this.warmupUntil) return result;
    const violations = result.violations.filter((x) => x.type !== 'NO_FACE');
    return { ...result, violations, status: statusOf(violations) };
  }
}

function v(
  type: FaceViolationType,
  message: string,
  severity: FaceViolation['severity'],
  confidence?: number,
): FaceViolation {
  return { type, message, severity, confidence };
}

/** POOR_LIGHTING is informational only — it never escalates the status. */
function statusOf(violations: FaceViolation[]): FaceStatus {
  const significant = violations.filter((x) => x.type !== 'POOR_LIGHTING');
  if (significant.some((x) => x.severity === 'high')) return 'VIOLATION';
  if (significant.some((x) => x.severity === 'medium')) return 'WARNING';
  return 'NORMAL';
}
