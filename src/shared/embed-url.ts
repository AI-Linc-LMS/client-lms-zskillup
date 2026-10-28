/**
 * Turn a link an operator pasted into a URL an <iframe> can actually load.
 *
 * Admins paste what is in their address bar — a YouTube watch page, a youtu.be share
 * link, a Vimeo page. None of those render in an iframe: YouTube sends
 * X-Frame-Options DENY on /watch, so the panel is silently blank with an error only in
 * the console. Normalising on READ as well as on write means links saved before this
 * existed also start working.
 *
 * Returns null for anything not recognised, and the caller renders nothing — an
 * operator typo must not put an arbitrary third-party frame on a public page.
 */
export function toEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;

  const host = u.hostname.replace(/^www\./, '');

  // youtube.com/watch?v=ID  |  youtube.com/embed/ID  |  youtube.com/shorts/ID
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v');
    if (v) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`;
    const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([A-Za-z0-9_-]{6,})/);
    if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
    return null;
  }
  // youtu.be/ID
  if (host === 'youtu.be') {
    const m = u.pathname.match(/^\/([A-Za-z0-9_-]{6,})/);
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
  }
  // vimeo.com/ID  |  vimeo.com/ID/HASH (unlisted)  |  player.vimeo.com/video/ID
  if (host === 'vimeo.com') {
    const m = u.pathname.match(/^\/(\d+)(?:\/([A-Za-z0-9]+))?/);
    if (!m) return null;
    return m[2]
      ? `https://player.vimeo.com/video/${m[1]}?h=${m[2]}`
      : `https://player.vimeo.com/video/${m[1]}`;
  }
  if (host === 'player.vimeo.com') return value;

  return null;
}

/** An https image URL, or null. Same reasoning: no arbitrary scheme on a public page. */
export function toImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
