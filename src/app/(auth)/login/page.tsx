'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { AuthLoginDto } from '@/shared';
import { login } from '@/lib/api/auth';
import { restoreSessionFromRefreshCookie } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/types';
import { FormField } from '@/components/ui/form-field';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import type { LoginResult } from '@/lib/api/auth';
import { AuthShell } from '@/components/auth/AuthShell';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthLoginDto>();

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSessionWarning(false);
    setUnverifiedEmail(null);
    try {
      const result = await login(values);
      handleLoginSuccess(result);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'SESSION_CONFLICT') {
        setSessionWarning(true);
        return;
      }
      if (err instanceof ApiRequestError && err.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(values.email);
        return;
      }
      setServerError(
        err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.',
      );
    }
  });

  const handleLoginSuccess = useCallback((result: LoginResult) => {
    // Show a full-screen "signing you in" overlay immediately so the login page
    // never looks frozen during the navigation + first dashboard data load.
    setRedirecting(true);
    let target = '/dashboard';
    if (!result.user.isOnboarded) {
      target = '/signup/onboarding';
    } else {
      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/')) target = redirect;
      else if (result.user.role === 'SUPER_ADMIN') target = '/superadmin/dashboard';
      else if (result.user.role === 'ADMIN') target = '/admin/dashboard';
      else if (result.user.role === 'COLLEGE_ADMIN') target = '/tpo/dashboard';
    }
    // replace() so Back doesn't return to the login page; the in-memory access
    // token is preserved (soft nav) so the destination loads its data fast.
    router.replace(target);
  }, [router, searchParams]);

  // Bounced here from a protected route (?redirect=...)? The middleware only sees
  // the `role` hint cookie, so a live session whose hint went missing (e.g. an
  // older session cookie that expired, or a hint cleared out-of-band) lands here
  // even though the HttpOnly refresh session is still valid. Instead of stranding
  // an authenticated user on a login form (and looping every time they click the
  // gated nav item), silently restore the session from the refresh cookie — which
  // re-stamps the durable `role` hint — and send them straight back.
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (!redirect || !redirect.startsWith('/')) return;
    let cancelled = false;
    setRedirecting(true);
    restoreSessionFromRefreshCookie()
      .then((outcome) => {
        if (cancelled) return;
        if (outcome === 'ok') router.replace(redirect);
        else setRedirecting(false); // genuinely logged out → show the form
      })
      .catch(() => {
        if (!cancelled) setRedirecting(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (redirecting) {
    return (
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
        <Loader2 className="size-7 animate-spin text-[var(--color-brand)]" />
        <p className="text-sm font-semibold text-[var(--color-text)]">Signing you in…</p>
        <p className="text-xs text-[var(--color-text-muted)]">Taking you to your workspace.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
          Welcome back
        </p>
        <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
          Sign in to your workspace
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
          Drop in your email - we&apos;ll take you straight to the right workspace.
        </p>
      </div>

      {/* Post-action success (set-password / reset) */}
      {searchParams.get('welcome') || searchParams.get('reset') ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {searchParams.get('welcome')
            ? 'Your password is set - welcome to ZSkillup! Sign in to continue.'
            : 'Password updated. Sign in with your new password.'}
        </div>
      ) : null}

      {/* Form */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card-lg)]">
        {/* Google first - the primary, one-tap path */}
        <GoogleSignInButton
          onSuccess={handleLoginSuccess}
          onError={(msg) => setServerError(msg)}
          text="continue_with"
        />

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-line)]" />
          </div>
          <div className="relative flex justify-center text-xs text-[var(--color-text-muted)]">
            <span className="bg-white px-3">or sign in with email</span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Enter a valid email address',
              },
            })}
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <input type="checkbox" className="rounded border-[var(--color-line)]" />
              Keep me signed in
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[var(--color-brand)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {sessionWarning && (
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-700"
            >
              You were signed out of another device - only one active session is allowed.
            </p>
          )}
          {unverifiedEmail && (
            <div
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
            >
              <p className="font-semibold">Email not verified yet</p>
              <p className="mt-1 text-xs leading-relaxed">
                We sent a 6-digit code to{' '}
                <span className="font-semibold">{unverifiedEmail}</span> when you first signed up.
                Verify now to finish setting up your account.
              </p>
              <Link
                href={`/signup/verify?email=${encodeURIComponent(unverifiedEmail)}`}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-amber-700"
              >
                Verify email now &rarr;
              </Link>
            </div>
          )}
          {serverError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-brand w-full rounded-full py-3 text-sm disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--color-text-muted)]">
          New to ZSkillup?{' '}
          <Link href="/signup" className="font-semibold text-[var(--color-brand)] hover:underline">
            Create a free account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-white" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
