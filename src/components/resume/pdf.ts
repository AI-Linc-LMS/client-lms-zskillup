import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { A4_WIDTH } from './ResumePreview';

/**
 * Render the full-size A4 resume node to a multi-page A4 PDF. The node is captured
 * at high pixel-ratio; if it's taller than one page, the image is sliced across
 * pages. Returns the PDF Blob (caller downloads or uploads).
 */
export async function resumeToPdfBlob(pageNode: HTMLElement): Promise<Blob> {
  // Capture at natural width regardless of any preview transform. html-to-image
  // reads the node's own layout box, so a scaled parent doesn't affect output.
  const dataUrl = await toPng(pageNode, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
    width: A4_WIDTH,
    // Neutralise the display transform during capture.
    style: { transform: 'none', transformOrigin: 'top left', boxShadow: 'none' },
  });

  const img = await loadImage(dataUrl);
  if (!img.width || !img.height) throw new Error('Resume capture failed - nothing to export.');
  // `compress: true` deflates the PDF's internal streams on top of the JPEG.
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const pageWmm = 210;
  const pageHmm = 297;
  // The captured image is A4_WIDTH px wide → map to 210mm; compute total height.
  const imgHmm = (img.height / img.width) * pageWmm;

  if (imgHmm <= pageHmm + 1) {
    // Re-encode the capture as JPEG before embedding. It used to embed the raw
    // lossless PNG, which made a one-page resume a ~10MB PDF; the multi-page path
    // below already did this. The page is opaque white, so there's no alpha to lose.
    pdf.addImage(toJpeg(img, img.width, img.height), 'JPEG', 0, 0, pageWmm, imgHmm);
  } else {
    // Slice the tall image into A4-height page chunks.
    const pageHpx = Math.floor((pageHmm / pageWmm) * img.width); // px per A4 page height
    let y = 0;
    let first = true;
    while (y < img.height) {
      const sliceH = Math.min(pageHpx, img.height - y);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = sliceH;
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, y, img.width, sliceH, 0, 0, img.width, sliceH);
      const sliceUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const sliceHmm = (sliceH / img.width) * pageWmm;
      if (!first) pdf.addPage();
      pdf.addImage(sliceUrl, 'JPEG', 0, 0, pageWmm, sliceHmm);
      first = false;
      y += sliceH;
    }
  }
  return pdf.output('blob');
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * JPEG quality for the embedded page image. At 2× pixel-ratio this is visually
 * indistinguishable from the lossless PNG for text/vector-style resumes, but ~20×
 * smaller — a one-page export drops from ~10MB to well under 1MB.
 */
const JPEG_QUALITY = 0.9;

/** Re-encode a captured image as a JPEG data URL on an opaque white canvas. */
function toJpeg(img: HTMLImageElement, w: number, h: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Resume export failed - canvas unavailable.');
  ctx.fillStyle = '#ffffff'; // JPEG has no alpha; flatten onto white
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
