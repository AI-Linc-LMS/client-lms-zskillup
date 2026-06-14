import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Refresh proxy route handler (ADR-006 / DATA_FLOW §2.2). The browser cannot
 * read the HttpOnly refresh cookie, so this server-side handler forwards it to
 * Nest `POST /api/v1/auth/refresh`, returns the new access token to the client,
 * and forwards any rotated `Set-Cookie` back to the browser.
 *
 * Block 3: structural stub wired end-to-end. The Nest endpoint it forwards to is
 * implemented in Block 6; until then a missing/!ok upstream yields 401, which
 * the API client treats as "refresh failed → redirect to login".
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  // Cookie name must match what the backend sets (zskillup_refresh, ADR-006).
  const refreshCookie = cookieStore.get('zskillup_refresh');

  if (!refreshCookie) {
    return NextResponse.json({ error: { code: 'NO_SESSION', message: 'No refresh token' } }, { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `zskillup_refresh=${refreshCookie.value}` },
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Auth service unavailable' } },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: { code: 'REFRESH_FAILED', message: 'Could not refresh session' } },
      { status: 401 },
    );
  }

  // Backend wraps every success response in `{ data, meta }` (DATA_FLOW §3).
  // The refresh payload is `{ data: { accessToken } }` — reading `accessToken`
  // off the envelope root yields undefined and silently logs the user out the
  // first time the in-memory access token expires. Always unwrap.
  const body = (await upstream.json()) as {
    accessToken?: string;
    data?: { accessToken?: string };
  };
  const accessToken = body.data?.accessToken ?? body.accessToken;
  if (!accessToken) {
    return NextResponse.json(
      { error: { code: 'REFRESH_FAILED', message: 'Refresh response missing token' } },
      { status: 401 },
    );
  }
  const response = NextResponse.json({ accessToken });

  // Forward the rotated refresh cookie (rotation, ADR-006) back to the browser.
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) {
    response.headers.set('set-cookie', setCookie);
  }
  return response;
}
