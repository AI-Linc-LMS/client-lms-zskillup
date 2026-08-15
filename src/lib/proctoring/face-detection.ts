import * as blazeface from '@tensorflow-models/blazeface';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';
import { HeadPoseEstimator, type HeadPose } from '@/lib/proctoring/head-pose';
import { MODEL_BASE } from '@/lib/proctoring/model-source';
import { ObjectProctor, type DetectedObjects } from '@/lib/proctoring/object-detection';

/**
 * Camera-intelligence layer for proctoring (Phase 1). A focused BlazeFace face
 * analyzer that runs over a video element the caller already owns - the
 * `useProctoring` controller opens the camera; this only watches it. Detection
 * heuristics (obstruction, off-centre, size, smoothing, warm-up) are ported from
 * the ai-linc engine, minus its camera/stream management.
 *
 * Face-box-centre "looking away" is a known-weak heuristic (it can't see gaze or
 * head-down); Phase 2 augments it with real head-pose. Everything here is
 * client-side and advisory - the server-stamped log is the tamper-resistant record.
 */

export type FaceViolationType =
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'FACE_NOT_VISIBLE'
  | 'LOOKING_AWAY'
  | 'FACE_TOO_CLOSE'
  | 'FACE_TOO_FAR'
  | 'POOR_LIGHTING'
  | 'PHONE_DETECTED'
  | 'BOOK_DETECTED'
  | 'SECOND_PERSON'
  | 'IDENTITY_MISMATCH';

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
  /** Run FaceMesh head-pose to catch looking-away/down the box heuristic misses. */
  enableHeadPose: boolean;
  /** Run head-pose every Nth detection tick (it's heavier than BlazeFace). */
  poseIntervalTicks: number;
  /** Deviation from the calibrated neutral pitch ratio that counts as looking away. */
  pitchDeltaThreshold: number;
  /** Good single-face samples to median into the neutral baseline before flagging. */
  poseCalibrationSamples: number;
  /** Run COCO-SSD to detect a phone / book / second person in frame. */
  enableObjectDetection: boolean;
  /** Run object detection every Nth tick (it's the heaviest model). */
  objectIntervalTicks: number;
  /** Min COCO-SSD score to count a detected object. */
  objectMinScore: number;
  /** Signature distance from the enrolled baseline that suggests a different person. */
  identityThreshold: number;
  /** Consecutive pose checks that must mismatch before flagging (kills noise). */
  identityStreak: number;
}

/** A frame costing more than this is a warning sign on this device. */
const SLOW_FRAME_MS = 700;
/** Consecutive slow frames tolerated before halving the cadence. */
const SLOW_FRAMES_BEFORE_BACKOFF = 3;
/** Past this the signal is worthless anyway - camera analysis stands down. */
const MAX_DETECTION_INTERVAL = 8000;
/** Longest edge of a violation snapshot, in px. */
const SNAPSHOT_MAX_EDGE = 480;
/** A gap longer than this means the thread stalled - re-arm the warm-up. */
const STALL_GAP_MS = 5000;
/** A tick in flight longer than this is presumed lost, not merely slow. */
const STUCK_TICK_MS = 20000;

export const DEFAULT_FACE_CONFIG: FaceProctorConfig = {
  // Stricter proctoring (#7). Face proctoring now runs ONLY on graded assessments
  // (removed from the mock interview), so we can afford a faster, more sensitive
  // cadence: check ~1.7x/sec, flag after fewer smoothing frames, and run the
  // head-pose (looking away) + object (phone/2nd person) models more often.
  // 2026-08-15 incident: four testers, two ejected, every laptop frozen 1-2 minutes.
  // Measured causes, in order of damage:
  //   - COCO-SSD lite_mobilenet_v2 is 18.6 MB of weights fetched from Google's CDN
  //     INSIDE the live exam, then 2,524-2,603 ms per inference on the tfjs CPU
  //     backend (measured on an Apple Silicon Mac - a fast machine) while scheduled
  //     every 2,400 ms. Scheduled faster than it can ever finish = an unbounded
  //     backlog on the main thread. It is now OFF by default.
  //   - the remaining models run at a calmer cadence, because a proctoring signal is
  //     worth nothing if it costs the candidate their exam.
  // The rule this file now obeys: THE EXAM OUTRANKS THE PROCTORING. Every setting
  // below is chosen so a mid-range laptop stays responsive, and anything that cannot
  // keep up is dropped rather than queued.
  detectionInterval: 1000,
  minFaceSize: 20,
  maxFaceSize: 75,
  lookingAwayThreshold: 0.28,
  minConfidence: 0.4,
  smoothFrameCount: 2,
  poorLightingThreshold: 0.42,
  minConfidenceForValidFace: 0.8,
  minEyeSpreadRatio: 0.22,
  startupWarmupMs: 5000,
  enableHeadPose: true,
  poseIntervalTicks: 5,   // FaceMesh every ~5s (was 1.2s)
  pitchDeltaThreshold: 0.14,
  poseCalibrationSamples: 6,
  enableObjectDetection: false, // 18.6 MB + ~2.5s/inference - never worth an exam
  objectIntervalTicks: 8,
  objectMinScore: 0.45,
  identityThreshold: 0.34,
  identityStreak: 2,
};

export interface FaceProctorCallbacks {
  onFrame?: (result: FaceFrameResult) => void;
  /** Camera analysis stood down (device too slow, or no WebGL). Advisory only -
   *  the assessment continues; the caller may surface a quiet notice. */
  onDegraded?: (reason: string) => void;
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
      // WebGL or nothing. The old CPU fallback is precisely what froze laptops on
      // 2026-08-15: tfjs on CPU runs these models 10-40x slower, on the main thread,
      // inside a timed exam. A candidate with no GPU acceleration now sits the paper
      // with camera analysis DISABLED (the free signals - fullscreen, tab switch,
      // window blur - keep working) instead of sitting a frozen one.
      await tf.setBackend('webgl');
      await tf.ready();
      if (tf.getBackend() !== 'webgl') {
        throw new Error('proctoring: WebGL unavailable - camera analysis disabled');
      }
      // Self-hosted weights. The library default points at tfhub.dev, which now
      // redirects to kaggle.com and then to a per-request SIGNED GCS url
      // (X-Goog-Expires=10800). That is three hops through hosts we do not control,
      // minted per candidate, in the critical path of a graded exam - and a campus
      // full of students hitting it at once is exactly when it fails. Served from
      // our own origin these are 460 KB.
      return blazeface.load({ modelUrl: `${MODEL_BASE}/blazeface/model.json` });
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
  private headPose: HeadPoseEstimator | null = null;
  private poseTick = 0;
  private basePitch: number | null = null;
  private pitchCalib: number[] = [];
  private baseSignature: number[] | null = null;
  private sigCalib: number[][] = [];
  private identityMiss = 0;
  private objectProctor: ObjectProctor | null = null;
  private objectTick = 0;
  /** True while a tick is mid-flight - the guard against overlapping inferences. */
  private tickInFlight = false;
  private skippedTicks = 0;
  private slowFrames = 0;
  /** Wall-clock of the last tick, to notice a main-thread gap. */
  private lastTickAt = 0;
  /** When the in-flight tick began, for the stuck-tick ceiling. */
  private tickStartedAt = 0;
  /** Live cadence; widened by backOff() when this device cannot keep up. */
  private interval = DEFAULT_FACE_CONFIG.detectionInterval;

  constructor(config: Partial<FaceProctorConfig> = {}) {
    this.config = { ...DEFAULT_FACE_CONFIG, ...config };
  }

  /**
   * Warm EVERYTHING the exam will run, during the device check, so no model is ever
   * fetched or compiled inside a timed paper. Previously this warmed BlazeFace only
   * and had no callers at all, so on "Begin" the page started downloading megabytes
   * of weights while the candidate was on question 1 - the 2026-08-15 freeze.
   * Never throws: a device that cannot preload simply sits the exam unproctored.
   */
  async preload(): Promise<void> {
    try {
      this.model = await loadModel();
    } catch {
      return; // no WebGL / no model - camera analysis stays off, exam proceeds
    }
    if (this.config.enableHeadPose) {
      this.headPose = this.headPose ?? new HeadPoseEstimator();
      await this.headPose.preload().catch(() => {
        this.headPose = null;
      });
    }
    if (this.config.enableObjectDetection) {
      this.objectProctor = this.objectProctor ?? new ObjectProctor();
      await this.objectProctor.preload().catch(() => {
        this.objectProctor = null;
      });
    }
  }

  /** Begin analyzing an already-playing video element. Safe to call repeatedly. */
  async start(video: HTMLVideoElement, callbacks: FaceProctorCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.video = video;
    this.model = await loadModel();
    if (this.config.enableHeadPose && !this.headPose) {
      this.headPose = new HeadPoseEstimator();
      // Non-blocking: the exam runs on BlazeFace alone until FaceMesh is ready,
      // and falls back to the box heuristic permanently if it won't load.
      void this.headPose.preload().catch(() => {
        this.headPose = null;
      });
    }
    if (this.config.enableObjectDetection && !this.objectProctor) {
      this.objectProctor = new ObjectProctor();
      void this.objectProctor.preload().catch(() => {
        this.objectProctor = null;
      });
    }
    if (this.running) return;
    this.running = true;
    this.warmupUntil = Date.now() + this.config.startupWarmupMs;
    this.interval = this.config.detectionInterval;
    this.tickInFlight = false;
    this.slowFrames = 0;
    this.skippedTicks = 0;
    this.lastTickAt = 0;
    this.timer = setInterval(() => void this.tick(), this.interval);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.video = null;
    this.faceCountBuffer = [];
    this.warmupUntil = 0;
    this.headPose?.dispose();
    this.headPose = null;
    this.poseTick = 0;
    this.basePitch = null;
    this.pitchCalib = [];
    this.baseSignature = null;
    this.sigCalib = [];
    this.identityMiss = 0;
    this.objectProctor?.dispose();
    this.objectProctor = null;
    this.objectTick = 0;
  }

  /** JPEG data URL of the current frame, for a violation snapshot. */
  snapshot(quality = 0.55): string | null {
    const v = this.video;
    if (!v || !v.videoWidth || !v.videoHeight) return null;
    // Downscaled deliberately. toDataURL is SYNCHRONOUS on the main thread and this
    // used to run at full camera resolution on every high-severity violation - which
    // arrive in bursts, each one adding a blocking encode to an already-struggling
    // tab. A 480px JPEG is ample to see whether a face is present, and it cut the
    // stored payload from ~23 KB average to a fraction of that (the violation table
    // was holding 34 MB of base64 for a handful of test sittings).
    const scale = Math.min(1, SNAPSHOT_MAX_EDGE / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  private async tick(): Promise<void> {
    const v = this.video;
    if (!this.running || !v || !this.model) return;
    // A tick is still running: SKIP this one, never queue it. setInterval does not
    // wait for an async handler, so without this every slow frame stacked another
    // inference onto the main thread until the tab stopped responding entirely.
    if (this.tickInFlight) {
      this.skippedTicks += 1;
      // A tick that never settles (e.g. WebGL context loss mid-inference) would pin
      // this flag true forever and stop every future frame - silently. Give it a
      // ceiling: past it, assume the frame is lost and let the next one through.
      if (this.tickStartedAt && Date.now() - this.tickStartedAt > STUCK_TICK_MS) {
        this.tickInFlight = false;
      } else {
        return;
      }
    }
    // Re-arm the NO_FACE warm-up after a gap. The warm-up existed to stop the first
    // frames after start() being scored before the camera settles - but it was armed
    // once and never again, so the first frames after a STALL were scored instantly,
    // against a stale image, and logged FACE_NOT_VISIBLE / LOOKING_AWAY at the very
    // moment the candidate was already fighting a frozen tab.
    const now = Date.now();
    // Threshold scales with the LIVE interval. A fixed 5s was shorter than the 8s
    // backed-off cadence, so a healthy slow tick read as a stall on every frame.
    const stallGap = Math.max(STALL_GAP_MS, this.interval * 2);
    if (this.lastTickAt && now - this.lastTickAt > stallGap) {
      this.warmupUntil = now + this.config.startupWarmupMs;
    }
    this.lastTickAt = now;
    this.tickInFlight = true;
    this.tickStartedAt = now;
    const startedAt = now;
    try {
      await this.runFrame(v);
    } finally {
      this.tickInFlight = false;
      // Self-governing cadence: if analysis costs more than the budget, slow down
      // (and eventually stand down). Better a sparse signal than a frozen exam.
      const cost = Date.now() - startedAt;
      if (cost > SLOW_FRAME_MS) {
        this.slowFrames += 1;
        if (this.slowFrames >= SLOW_FRAMES_BEFORE_BACKOFF) {
          this.slowFrames = 0;
          this.backOff();
        }
      } else if (this.slowFrames > 0) {
        this.slowFrames -= 1;
      }
    }
  }

  /** Widen the interval, and disable camera analysis entirely if even that is too
   *  slow for this machine. The exam continues either way. */
  private backOff(): void {
    // stop() may have run while this tick was in flight. Without this guard the
    // finally-block below would arm a fresh interval on a stopped proctor that no
    // one holds a reference to any more: an orphan timer pinning a WebGL model for
    // the life of the tab.
    if (!this.running) return;
    if (this.interval >= MAX_DETECTION_INTERVAL) {
      this.callbacks.onDegraded?.('This device is too slow for camera analysis - it has been turned off. Your assessment continues.');
      this.stopAnalysisOnly();
      return;
    }
    this.interval = Math.min(MAX_DETECTION_INTERVAL, this.interval * 2);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => void this.tick(), this.interval);
  }

  /** Stop the models but keep the object alive (snapshots/summary still work). */
  private stopAnalysisOnly(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.headPose?.dispose();
    this.headPose = null;
    this.objectProctor?.dispose();
    this.objectProctor = null;
  }

  private async runFrame(v: HTMLVideoElement): Promise<void> {
    if (!v.videoWidth || !v.videoHeight || v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }
    try {
      const result = this.suppressWarmupNoFace(await this.analyze(v));
      await this.applyHeadPose(v, result);
      await this.applyObjectDetection(v, result);
      this.callbacks.onFrame?.(result);
    } catch {
      // WebGL/model warm-up glitches are common on first frames - never map to NO_FACE.
    }
  }

  /** Every Nth tick, scan the frame for a phone / book / second person - cheating
   *  aids the face models can't see. Heaviest model, so the slowest cadence. */
  private async applyObjectDetection(video: HTMLVideoElement, result: FaceFrameResult): Promise<void> {
    if (!this.objectProctor) return;
    if (++this.objectTick % this.config.objectIntervalTicks !== 0) return;
    let objects: DetectedObjects | null = null;
    try {
      objects = await this.objectProctor.detect(video, this.config.objectMinScore);
    } catch {
      return;
    }
    if (!objects) return;
    if (objects.phone) result.violations.push(v('PHONE_DETECTED', 'A phone is visible in frame', 'high'));
    if (objects.book) result.violations.push(v('BOOK_DETECTED', 'A book or notes are visible in frame', 'high'));
    if (objects.extraPerson) {
      result.violations.push(v('SECOND_PERSON', 'A second person is visible in frame', 'high'));
    }
    if (objects.phone || objects.book || objects.extraPerson) {
      result.status = statusOf(result.violations);
    }
  }

  /**
   * Every Nth tick, use FaceMesh head-pose to catch looking-away/down that the
   * face-box heuristic misses. First it medians a neutral baseline (the student is
   * looking at the screen reading instructions), then flags sustained deviation -
   * chiefly the VERTICAL axis (reading notes/a phone below the camera), the case
   * BlazeFace is blind to. Runs single-face only; failures fall back silently.
   */
  private async applyHeadPose(video: HTMLVideoElement, result: FaceFrameResult): Promise<void> {
    if (!this.headPose || result.faceCount !== 1) return;
    if (++this.poseTick % this.config.poseIntervalTicks !== 0) return;
    let pose: HeadPose | null = null;
    try {
      pose = await this.headPose.estimate(video);
    } catch {
      return;
    }
    if (!pose || !Number.isFinite(pose.pitchRatio)) return;

    if (this.basePitch === null) {
      this.pitchCalib.push(pose.pitchRatio);
      this.sigCalib.push(pose.signature);
      if (this.pitchCalib.length >= this.config.poseCalibrationSamples) {
        const sorted = [...this.pitchCalib].sort((a, b) => a - b);
        this.basePitch = sorted[Math.floor(sorted.length / 2)];
        this.baseSignature = medianVector(this.sigCalib);
      }
      return;
    }

    // Looking away/down (chiefly the vertical axis BlazeFace can't see).
    if (Math.abs(pose.pitchRatio - this.basePitch) > this.config.pitchDeltaThreshold) {
      const merged = result.violations.filter((x) => x.type !== 'LOOKING_AWAY');
      merged.push(v('LOOKING_AWAY', 'You appear to be looking away from the screen', 'medium'));
      result.violations = merged;
      result.status = statusOf(merged);
    }

    // Identity continuity: a sustained large deviation from the enrolled facial
    // signature suggests a different person took the seat. Lightweight (reuses the
    // FaceMesh call) - not biometric-grade; the streak requirement kills noise.
    if (this.baseSignature && pose.signature.length === this.baseSignature.length) {
      let sq = 0;
      for (let i = 0; i < pose.signature.length; i++) {
        const d = pose.signature[i] - this.baseSignature[i];
        sq += d * d;
      }
      if (Math.sqrt(sq) > this.config.identityThreshold) {
        if (++this.identityMiss >= this.config.identityStreak) {
          result.violations.push(
            v('IDENTITY_MISMATCH', 'The person in frame may have changed', 'high'),
          );
          result.status = statusOf(result.violations);
        }
      } else {
        this.identityMiss = 0;
      }
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

  /** Mode over the last N frames - kills 0/1/0/1 flicker on noisy webcams. */
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

/** POOR_LIGHTING is informational only - it never escalates the status. */
function statusOf(violations: FaceViolation[]): FaceStatus {
  const significant = violations.filter((x) => x.type !== 'POOR_LIGHTING');
  if (significant.some((x) => x.severity === 'high')) return 'VIOLATION';
  if (significant.some((x) => x.severity === 'medium')) return 'WARNING';
  return 'NORMAL';
}

/** Per-component median of equal-length vectors (robust baseline from samples). */
function medianVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dims = vectors[0].length;
  const out: number[] = [];
  for (let i = 0; i < dims; i++) {
    const col = vectors.map((vec) => vec[i]).sort((a, b) => a - b);
    out.push(col[Math.floor(col.length / 2)]);
  }
  return out;
}
