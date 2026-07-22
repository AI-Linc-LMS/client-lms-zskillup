/**
 * Downscale an image file to a compressed data-URL, PRESERVING aspect ratio.
 *
 * Used for question diagrams (Data-Interpretation charts, Venn diagrams) which
 * are stored inline as data-URLs on the question. Unlike the square-cropping
 * avatar resizer, this keeps the whole figure and only bounds the longest edge,
 * so a chart is never cropped. Returns a JPEG data-URL (small) - or PNG when the
 * source is a PNG with transparency-ish name, to keep diagram lines crisp.
 */
export async function resizeImageToDataUrl(
  file: File,
  maxDim = 1100,
  quality = 0.85,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not load the image'));
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl; // no canvas - fall back to the original
  // White matte so a transparent PNG chart doesn't turn black on JPEG encode.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}
