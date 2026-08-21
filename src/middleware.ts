import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_COOKIE = 'role';
/** UX hint set while a super-admin runs the "view as student" preview. */
const PREVIEW_COOKIE = 'preview';

const AUTH_ROUTES = ['/login', '/signup'];

/**
 * Protected route prefixes - unauthenticated visitors are redirected to /login.
 * RBAC in the UI is UX only; Nest guards are the security boundary (CLAUDE.md §5).
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/my-learning',
  '/mock-tests',
  '/mock-assessment',
  '/performance',
  '/topic-mastery',
  // NOTE: '/practice' is deliberately NOT gated here. It is `force-dynamic`, so Next fetches its
  // RSC from the server on prefetch/soft-nav; a middleware /login redirect for that request gets
  // CACHED (Next router + Netlify Durable) and replayed on the real click even once the `role`
  // cookie is present — the reported first-click bounce (session valid, cleared by a full refresh;
  // regression RCA 2026-08-13). Keeping it out of the redirect path means /practice always resolves
  // to the page (200), never a cacheable redirect. It stays gated client-side (AppShell + apiClient
  // 401 handling) and the practice DATA endpoints require auth — Nest guards are the real boundary.
  '/practice-wish',
  '/upgrade',
  '/cart',
  '/shop',
  '/assessments',
  '/calendar',
  '/coding',
  '/resume-builder',
  '/mock-interview',
  '/tpo',
  '/admin',
  '/superadmin',
];

function startsWithPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => startsWithPrefix(pathname, p));
}

/**
 * Onboarding lives under /signup but is the ONE auth-group route an
 * AUTHENTICATED user must be able to reach: login sends an un-onboarded student
 * straight here. Matching it as an auth route bounced them to their role home
 * the moment the `role` cookie existed, so onboarding was unreachable after a
 * fresh sign-in and any deep link they arrived with was dropped on the way.
 */
function isOnboardingRoute(pathname: string): boolean {
  return startsWithPrefix(pathname, '/signup/onboarding');
}

function isAuthRoute(pathname: string): boolean {
  if (isOnboardingRoute(pathname)) return false;
  return AUTH_ROUTES.some((p) => startsWithPrefix(pathname, p));
}

/** Student-workspace area = every protected route that isn't an admin/TPO console. */
function isStudentArea(pathname: string): boolean {
  return (
    isProtected(pathname) &&
    !startsWithPrefix(pathname, '/superadmin') &&
    !startsWithPrefix(pathname, '/admin') &&
    !startsWithPrefix(pathname, '/tpo')
  );
}

/** Role-appropriate landing page for already-authenticated users. */
function roleHome(role: string | undefined): string {
  if (role === 'SUPER_ADMIN') return '/superadmin/dashboard';
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'COLLEGE_ADMIN') return '/tpo/dashboard';
  return '/dashboard';
}

/**
 * Route-group RBAC + role redirect (CLAUDE.md §3 / ADR-003). The role cookie is
 * a client-set UX hint - backend guards remain the authority - but honouring it
 * here means a role-mismatched visit (e.g. an admin opening /mock-tests) lands
 * on the right workspace instead of a page full of 403 "Insufficient role"
 * errors. A SUPER_ADMIN with the preview cookie is deliberately allowed into
 * the student area ("view as student").
 */
/** The only domain the app may run on. Razorpay live checkout is registered to
 *  it, and session cookies are host-scoped - so the raw Netlify subdomain must
 *  never serve the app (a payment there fails "Website Mismatch", and a login
 *  there doesn't carry to prephasz.com). */
const CANONICAL_HOST = 'prephasz.com';
const NETLIFY_HOST = 'zskilluplms.netlify.app';

/**
 * A redirect that must NEVER be cached.
 *
 * The middleware's session signal is a COOKIE, so any redirect it issues is
 * valid only for the request that produced it. Next's router cache and
 * Netlify's Durable cache both happily store a 307 that carries no
 * Cache-Control and replay it once the cookie IS present - which is the
 * "first click bounces to /login, a hard refresh fixes it" regression that has
 * now been reported three times (/practice twice, then /dashboard/quiz on
 * Start Assessment). Both previous fixes pulled ONE route out of the gate;
 * this marks every session-dependent redirect uncacheable instead, so the next
 * protected route added can't reintroduce it.
 */
function sessionRedirect(url: URL | string, status?: number): NextResponse {
  const res = status ? NextResponse.redirect(url, status) : NextResponse.redirect(url);
  res.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  res.headers.set('Vary', 'Cookie, RSC');
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Canonical-domain guard - runs BEFORE the auth gate so it catches protected
  // routes too (the netlify.toml edge redirect is shadowed by this middleware
  // for those paths, so the redirect has to live here as well). Preserves path
  // + query; deploy previews (deploy-preview-*--…) don't match the exact host.
  if (request.headers.get('host') === NETLIFY_HOST) {
    return NextResponse.redirect(
      `https://${CANONICAL_HOST}${pathname}${request.nextUrl.search}`,
      301,
    );
  }

  // Company hubs are PUBLICLY browsable - they're linked from the marketing/
  // landing pages and their backend endpoints are @Public. Allow everyone
  // (logged-out visitors, students, and admins) through without the auth gate
  // or the role-mismatch redirect, so "Company Hub" never bounces to /login.
  if (startsWithPrefix(pathname, '/dashboard/company')) {
    return NextResponse.next();
  }

  // Frontend and API are on different domains in prod, so the HttpOnly refresh
  // cookie (set on the API domain) is invisible to this middleware. Use the
  // first-party `role` hint cookie (set by the client on login, cleared on
  // logout) as the session signal for routing - Nest guards remain the security
  // boundary (CLAUDE.md §5).
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  const hasSession = role !== undefined;

  // Next.js router (soft-nav + prefetch) requests carry an `RSC` header. NEVER issue a /login
  // redirect for them: Next caches a redirected RSC/prefetch response and replays it on the real
  // click even after the `role` cookie is present — so a soft navigation to a force-dynamic
  // route (e.g. /practice) bounces to /login on the FIRST click, and a full refresh (which clears
  // Next's router cache) makes it work (reported 2026-08-13, session valid throughout). The
  // client holds the real session and gates soft navs itself; only a full-document load (no RSC
  // header) is bounced here. UI-level routing only — Nest guards are the security boundary.
  const isRscRequest = request.headers.get('rsc') === '1';

  // Unauthenticated → redirect to login, preserve deep-link target.
  if (isProtected(pathname) && !hasSession) {
    if (isRscRequest) return NextResponse.next();
    const loginUrl = new URL('/login', request.url);
    // Keep the QUERY STRING, not just the path. A campaign link like
    // /cart?add=PLATFORM:MONTHLY clicked while signed out used to arrive at the cart
    // stripped of everything it was selling - the student landed on an empty cart and
    // the campaign silently lost the sale. sanitizeRedirect() on the login side already
    // restricts this to same-site paths.
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    return sessionRedirect(loginUrl);
  }

  // Already authenticated → skip auth pages, go straight to workspace.
  // Requires BOTH cookies: the HttpOnly refresh cookie can outlive a revoked
  // session (the client can't clear it), and bouncing /login on that alone
  // creates a /login → /dashboard → 401 → /login navigation loop. The role
  // hint cookie IS clearable by the client on session teardown, so its
  // absence means "let the visitor reach the login form".
  if (isAuthRoute(pathname) && hasSession && role) {
    return sessionRedirect(new URL(roleHome(role), request.url));
  }

  // Role-group RBAC: send a role-mismatched visit to its own workspace.
  if (hasSession && role) {
    const previewingStudent =
      role === 'SUPER_ADMIN' && request.cookies.get(PREVIEW_COOKIE)?.value === 'student';

    const mismatch =
      (startsWithPrefix(pathname, '/superadmin') && role !== 'SUPER_ADMIN') ||
      (startsWithPrefix(pathname, '/admin') && role !== 'ADMIN') ||
      (startsWithPrefix(pathname, '/tpo') && role !== 'COLLEGE_ADMIN') ||
      (isStudentArea(pathname) && role !== 'STUDENT' && !previewingStudent);

    if (mismatch) {
      return sessionRedirect(new URL(roleHome(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
