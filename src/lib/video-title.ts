/**
 * Turn a raw Vimeo export filename into a human-readable lesson title.
 *
 *   "S2_V320_network_types"        → "Network Types"
 *   "S1_V060_traversal_logic"      → "Traversal Logic"
 *   "S2_V323_peer_to_peer_model"   → "Peer To Peer Model"
 *   "Capgemini — Introduction"     → "Capgemini — Introduction"   (already human, untouched)
 *
 * Strips a leading season/video code (S<n>_V<n>_ / S<n>-V<n>- …), swaps underscores for
 * spaces, collapses whitespace, and Title-Cases — but ONLY when the source looks like a
 * coded filename (had the code prefix or underscores), so a clean human title is left as
 * is. The result is still fully editable on the platform afterwards.
 */
export function cleanVideoTitle(raw: string): string {
  const original = (raw ?? '').trim();
  if (!original) return original;
  const looksCoded = /^[sS]\d+[_\-\s]*[vV]\d+/.test(original) || /_/.test(original);
  let t = original.replace(/^[sS]\d+[_\-\s]*[vV]\d+[_\-\s]*/, '').trim();
  if (!t) t = original; // the whole thing was a code — fall back rather than empty it
  t = t.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  if (looksCoded) {
    // Capitalise the first letter of each word; leave the rest of the word as-is so an
    // acronym that survived (e.g. "SQL", "TCP") isn't lower-cased.
    t = t
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }
  return t;
}
