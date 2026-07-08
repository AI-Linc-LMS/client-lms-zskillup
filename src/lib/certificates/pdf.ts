import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { CERT_W } from '@/components/certificates/Certificate';

export { downloadBlob } from '@/components/resume/pdf';

/**
 * Capture a certificate node (native A4-landscape px canvas) to a single-page
 * landscape A4 PDF. Neutralises any display transform during capture so a scaled
 * preview still exports at full resolution.
 */
export async function certificateToPdfBlob(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    width: CERT_W,
    style: { transform: 'none', transformOrigin: 'top left', boxShadow: 'none' },
  });
  const pdf = new jsPDF('l', 'mm', 'a4'); // 297 × 210 mm
  pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
  return pdf.output('blob');
}
