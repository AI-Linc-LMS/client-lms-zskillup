import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-core';

/**
 * Object-in-frame detection (COCO-SSD lite) for proctoring — catches a phone,
 * printed notes/book, or a second person, none of which the face models see.
 * Heavy relative to BlazeFace, so the caller runs it on a slow cadence, and it
 * falls back silently if the model won't load. `laptop`/`tv` are deliberately
 * ignored (the exam device itself is a laptop → constant false positive).
 */
export interface DetectedObjects {
  phone: boolean;
  book: boolean;
  /** More than one person visible in the frame. */
  extraPerson: boolean;
}

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

async function loadModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = cocoSsd.load({ base: 'lite_mobilenet_v2' }).catch((err) => {
      modelPromise = null; // allow a retry
      throw err;
    });
  }
  return modelPromise;
}

export class ObjectProctor {
  private model: cocoSsd.ObjectDetection | null = null;

  async preload(): Promise<void> {
    this.model = await loadModel();
  }

  async detect(video: HTMLVideoElement, minScore = 0.5): Promise<DetectedObjects | null> {
    if (!this.model) this.model = await loadModel();
    const predictions = await this.model.detect(video, 20, minScore);
    let personCount = 0;
    let phone = false;
    let book = false;
    for (const p of predictions) {
      if (p.score < minScore) continue;
      if (p.class === 'person') personCount += 1;
      else if (p.class === 'cell phone') phone = true;
      else if (p.class === 'book') book = true;
    }
    return { phone, book, extraPerson: personCount > 1 };
  }

  dispose(): void {
    this.model = null;
  }
}
