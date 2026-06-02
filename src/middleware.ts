import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REFRESH_COOKIE = 'zskillup_refresh';
const ROLE_COOKIE = 'role';

const AUTH_ROUTES = ['/login', '/signup'];

/**
 * Protected route prefixes — unauthenticated visitors are redirected to /login.
 * RBAC in the UI is UX only; Nest guards are the security boundary (CLAUDE.md §5).
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/my-learning',
  '/assignments',
  '/mock-tests',
  '/certifications',
  '/performance',
  '/campus-recruitment',
  '/skill-tracks',
  '/cohort-programs',
  '/knowledge-base',
  '/help',
  '/topic-mastery',
  '/practice',
  '/tpo',
  '/superadmin',
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/** Role-appropriate landing page for already-authenticated users. */
function roleHome(request: NextRequest): string {
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  if (role === 'SUPER_ADMIN') return '/superadmin/dashboard';
  if (role === 'COLLEGE_ADMIN') return '/tpo/dashboard';
  return '/dashboard';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_COOKIE);

  // Unauthenticated → redirect to login, preserve deep-link target.
  if (isProtected(pathname) && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated → skip auth pages, go straight to workspace.
  if (isAuthRoute(pathname) && hasSession) {
    return NextResponse.redirect(new URL(roleHome(request), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
