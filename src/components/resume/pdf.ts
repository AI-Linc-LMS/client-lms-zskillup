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
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWmm = 210;
  const pageHmm = 297;
  // The captured image is A4_WIDTH px wide → map to 210mm; compute total height.
  const imgHmm = (img.height / img.width) * pageWmm;

  if (imgHmm <= pageHmm + 1) {
    pdf.addImage(dataUrl, 'PNG', 0, 0, pageWmm, imgHmm);
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
      const sliceUrl = canvas.toDataURL('image/jpeg', 0.95);
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
