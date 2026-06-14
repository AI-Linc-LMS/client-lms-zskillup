import { authToken } from '@/store/auth';
import { _setPreviewRestorer } from '@/lib/api/client';
import { impersonateStudent } from '@/lib/api/admin';

/**
 * Super-admin "view as student" preview helpers. Navigation is left to the
 * caller (each surface pushes the right route); these toggle the in-memory
 * preview token plus a `preview=student` UX-hint cookie. The cookie does two
 * jobs: it lets the middleware admit a SUPER_ADMIN into the student route
 * group, and it lets the app re-mint the (memory-only) preview token after a
 * hard refresh instead of hitting student endpoints with the admin token —
 * which would surface 403 "Insufficient role" errors. The admin's real session
 * is never touched.
 */

const PREVIEW_COOKIE = 'preview';

/** Enter preview: mint a student token and layer it over the admin session. */
export async function startStudentPreview(): Promise<void> {
  const res = await impersonateStudent();
  authToken.startPreview(res.accessToken, res.user);
  document.cookie = `${PREVIEW_COOKIE}=student; path=/; samesite=lax`;
}

/** Exit preview: drop the student token, falling back to the admin session. */
export function exitStudentPreview(): void {
  authToken.stopPreview();
  if (typeof document !== 'undefined') {
    document.cookie = `${PREVIEW_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

// Let the API client re-mint the preview token after a hard refresh (the token
// is memory-only; the cookie survives). Registered here to avoid import cycles.
_setPreviewRestorer(startStudentPreview);
