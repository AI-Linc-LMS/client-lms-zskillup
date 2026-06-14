import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Logout proxy route handler (CLAUDE.md §3 / ADR-006). Same-origin endpoint
 * that forwards the HttpOnly `zskillup_refresh` cookie to Nest so the backend
 * can revoke the session, then clears the cookie on the client.
 *
 * This was identified as a gap by the QA audit (release blocker) — without
 * it the client either had to call the backend cross-origin (works, but the
 * documented architecture says proxy through Next) or skip the server-side
 * revoke entirely.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const REFRESH_COOKIE = 'zskillup_refresh';

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE);

  // Best-effort: tell the backend to revoke the session family.
  if (refresh) {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Cookie: `${REFRESH_COOKIE}=${refresh.value}` },
      });
    } catch {
      // Network failure shouldn't block the client-side logout — we still
      // want to clear the cookie below.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  // Clear the HttpOnly refresh cookie on the client.
  response.cookies.set(REFRESH_COOKIE, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
