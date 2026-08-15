/**
 * Where the proctoring model weights are served from.
 *
 * Its own module on purpose: both face-detection.ts and head-pose.ts need it, and
 * face-detection already imports head-pose - putting the constant in either one
 * creates an import cycle.
 *
 * Same-origin by design. The tfjs libraries default to tfhub.dev, which now
 * redirects to kaggle.com and then to a per-request signed GCS url that expires in
 * three hours. That is three third-party hops in the critical path of a graded
 * exam, minted per candidate. The weights live in public/models (2.9 MB total).
 */
export const MODEL_BASE = '/models';
