/**
 * Bundler stub for `@mediapipe/face_mesh`.
 *
 * `@tensorflow-models/face-landmarks-detection` statically imports the `FaceMesh`
 * class for its 'mediapipe' (WASM) runtime, but proctoring only ever uses the
 * pure 'tfjs' runtime, so that symbol is never constructed. `@mediapipe/face_mesh`
 * is a UMD script with no ESM exports, which breaks Turbopack's static analysis.
 * Aliasing it to this stub (see next.config.ts) satisfies the import without
 * pulling in the WASM package.
 */
export const FaceMesh = undefined;
export default {};
