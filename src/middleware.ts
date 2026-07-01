import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_COOKIE = 'role';
/** UX hint set while a super-admin runs the "view as student" preview. */
const PREVIEW_COOKIE = 'preview';

const AUTH_ROUTES = ['/login', '/signup'];

/**
 * Protected route prefixes — unauthenticated visitors are redirected to /login.
 * RBAC in the UI is UX only; Nest guards are the security boundary (CLAUDE.md §5).
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/my-learning',
  '/mock-tests',
  '/mock-assessment',
  '/performance',
  '/topic-mastery',
  '/practice',
  '/practice-wish',
  '/assessments',
  '/calendar',
  '/coding',
  '/tpo',
  '/superadmin',
];

function startsWithPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => startsWithPrefix(pathname, p));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((p) => startsWithPrefix(pathname, p));
}

/** Student-workspace area = every protected route that isn't an admin/TPO console. */
function isStudentArea(pathname: string): boolean {
  return (
    isProtected(pathname) &&
    !startsWithPrefix(pathname, '/superadmin') &&
    !startsWithPrefix(pathname, '/tpo')
  );
}

/** Role-appropriate landing page for already-authenticated users. */
function roleHome(role: string | undefined): string {
  if (role === 'SUPER_ADMIN') return '/superadmin/dashboard';
  if (role === 'COLLEGE_ADMIN') return '/tpo/dashboard';
  return '/dashboard';
}

/**
 * Route-group RBAC + role redirect (CLAUDE.md §3 / ADR-003). The role cookie is
 * a client-set UX hint — backend guards remain the authority — but honouring it
 * here means a role-mismatched visit (e.g. an admin opening /mock-tests) lands
 * on the right workspace instead of a page full of 403 "Insufficient role"
 * errors. A SUPER_ADMIN with the preview cookie is deliberately allowed into
 * the student area ("view as student").
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Company hubs are PUBLICLY browsable — they're linked from the marketing/
  // landing pages and their backend endpoints are @Public. Allow everyone
  // (logged-out visitors, students, and admins) through without the auth gate
  // or the role-mismatch redirect, so "Company Hub" never bounces to /login.
  if (startsWithPrefix(pathname, '/dashboard/company')) {
    return NextResponse.next();
  }

  // Frontend and API are on different domains in prod, so the HttpOnly refresh
  // cookie (set on the API domain) is invisible to this middleware. Use the
  // first-party `role` hint cookie (set by the client on login, cleared on
  // logout) as the session signal for routing — Nest guards remain the security
  // boundary (CLAUDE.md §5).
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  const hasSession = role !== undefined;

  // Unauthenticated → redirect to login, preserve deep-link target.
  if (isProtected(pathname) && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated → skip auth pages, go straight to workspace.
  // Requires BOTH cookies: the HttpOnly refresh cookie can outlive a revoked
  // session (the client can't clear it), and bouncing /login on that alone
  // creates a /login → /dashboard → 401 → /login navigation loop. The role
  // hint cookie IS clearable by the client on session teardown, so its
  // absence means "let the visitor reach the login form".
  if (isAuthRoute(pathname) && hasSession && role) {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  // Role-group RBAC: send a role-mismatched visit to its own workspace.
  if (hasSession && role) {
    const previewingStudent =
      role === 'SUPER_ADMIN' && request.cookies.get(PREVIEW_COOKIE)?.value === 'student';

    const mismatch =
      (startsWithPrefix(pathname, '/superadmin') && role !== 'SUPER_ADMIN') ||
      (startsWithPrefix(pathname, '/tpo') && role !== 'COLLEGE_ADMIN') ||
      (isStudentArea(pathname) && role !== 'STUDENT' && !previewingStudent);

    if (mismatch) {
      return NextResponse.redirect(new URL(roleHome(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
