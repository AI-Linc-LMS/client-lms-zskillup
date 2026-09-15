/**
 * Hands a Blob to the browser as a file download. The link is attached to the document
 * (Firefox ignores clicks on detached anchors) and the object URL is revoked a moment
 * later, once the download has started.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
