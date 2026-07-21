import * as faceLandmarks from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-core';

/**
 * Head-pose estimation via MediaPipe FaceMesh (468 landmarks) — the accuracy win
 * over BlazeFace's box heuristic. It returns raw geometric ratios; the caller
 * calibrates a per-user neutral baseline (faces differ) and flags deviations.
 * The key gain is the VERTICAL axis: looking down at notes/a phone keeps the face
 * box centred, so BlazeFace can't see it, but the nose-within-eye→chin ratio moves.
 */
export interface HeadPose {
  /** Nose vertical position within the eye→chin span (pitch proxy). */
  pitchRatio: number;
  /** Nose horizontal position within the face width (0.5 = centred; yaw proxy). */
  yawRatio: number;
  /** In-plane head tilt, degrees. */
  roll: number;
  /** Person-specific facial proportions, all normalised by inter-ocular distance
   *  (scale/distance-invariant). A different person yields a different vector —
   *  used for lightweight identity-continuity, not biometric-grade matching. */
  signature: number[];
}

// FaceMesh canonical landmark indices.
const NOSE = 1;
const LEFT_EYE = 33;
const RIGHT_EYE = 263;
const CHIN = 152;
const FOREHEAD = 10;
const LEFT_FACE = 234;
const RIGHT_FACE = 454;
const NOSE_L = 129;
const NOSE_R = 358;
const MOUTH_L = 61;
const MOUTH_R = 291;

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

let detectorPromise: Promise<faceLandmarks.FaceLandmarksDetector> | null = null;

async function loadDetector(): Promise<faceLandmarks.FaceLandmarksDetector> {
  if (!detectorPromise) {
    detectorPromise = faceLandmarks
      .createDetector(faceLandmarks.SupportedModels.MediaPipeFaceMesh, {
        runtime: 'tfjs',
        refineLandmarks: false,
        maxFaces: 1,
      })
      .catch((err) => {
        detectorPromise = null; // allow a retry
        throw err;
      });
  }
  return detectorPromise;
}

export class HeadPoseEstimator {
  private detector: faceLandmarks.FaceLandmarksDetector | null = null;

  async preload(): Promise<void> {
    this.detector = await loadDetector();
  }

  async estimate(video: HTMLVideoElement): Promise<HeadPose | null> {
    if (!this.detector) this.detector = await loadDetector();
    const faces = await this.detector.estimateFaces(video, { flipHorizontal: false });
    if (!faces.length) return null;
    const kp = faces[0].keypoints;
    const nose = kp[NOSE];
    const leftEye = kp[LEFT_EYE];
    const rightEye = kp[RIGHT_EYE];
    const chin = kp[CHIN];
    const leftFace = kp[LEFT_FACE];
    const rightFace = kp[RIGHT_FACE];
    if (!nose || !leftEye || !rightEye || !chin || !leftFace || !rightFace) return null;

    const eyeLineY = (leftEye.y + rightEye.y) / 2;
    const span = chin.y - eyeLineY;
    const faceWidth = rightFace.x - leftFace.x;
    if (span === 0 || faceWidth === 0) return null;

    // Identity signature — proportions normalised by inter-ocular distance so
    // they're stable across distance/scale. Absent landmarks fall back to 0.
    const io = dist(leftEye, rightEye) || 1;
    const noseL = kp[NOSE_L];
    const noseR = kp[NOSE_R];
    const mouthL = kp[MOUTH_L];
    const mouthR = kp[MOUTH_R];
    const forehead = kp[FOREHEAD];
    const signature = [
      noseL && noseR ? dist(noseL, noseR) / io : 0,
      mouthL && mouthR ? dist(mouthL, mouthR) / io : 0,
      forehead ? dist(forehead, chin) / io : 0,
      (chin.y - eyeLineY) / io,
    ];

    return {
      pitchRatio: (nose.y - eyeLineY) / span,
      yawRatio: (nose.x - leftFace.x) / faceWidth,
      roll: (Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180) / Math.PI,
      signature,
    };
  }

  dispose(): void {
    this.detector = null;
  }
}
