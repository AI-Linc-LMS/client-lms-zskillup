'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authLoginSchema, type AuthLoginDto } from '@/shared';
import { login } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';

type Role = 'student' | 'admin';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>('student');
  const [serverError, setServerError] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState(false);
  /** Email captured from the form when login fails with EMAIL_NOT_VERIFIED. */
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthLoginDto>({ resolver: zodResolver(authLoginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSessionWarning(false);
    setUnverifiedEmail(null);
    try {
      const result = await login(values);
      if (!result.user.isOnboarded) {
        router.push('/signup/onboarding');
        return;
      }
      // Honour deep-link redirect param (set by middleware on auth-gated access).
      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/')) {
        router.push(redirect);
        return;
      }
      // Route by role directly to the correct workspace.
      if (result.user.role === 'SUPER_ADMIN') {
        router.push('/superadmin/dashboard');
      } else if (result.user.role === 'COLLEGE_ADMIN') {
        router.push('/tpo/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'SESSION_CONFLICT') {
        setSessionWarning(true);
        return;
      }
      if (err instanceof ApiRequestError && err.code === 'EMAIL_NOT_VERIFIED') {
        // Capture the email so the recovery panel can route to /signup/verify.
        setUnverifiedEmail(values.email);
        return;
      }
      setServerError(
        err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <>
      {/* Role toggle */}
      <div
        className="mb-6 grid grid-cols-2 overflow-hidden rounded-lg border bg-white p-1"
        role="group"
        aria-label="Sign-in role"
      >
        {(['student', 'admin'] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              'rounded-md py-2 text-sm font-semibold capitalize transition-colors',
              role === r ? 'bg-navy text-white shadow' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {r === 'student' ? 'Student' : 'Admin'}
          </button>
        ))}
      </div>

      {/* Form card */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            error={errors.email?.message}
            {...register('email')}
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="rounded border-input" />
              Keep me signed in
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-orange hover:underline">
              Forgot password?
            </Link>
          </div>

          {sessionWarning && (
            <p role="alert" className="rounded-md bg-orange/10 p-3 text-sm text-orange">
              You were signed out of another device — only one active session is allowed.
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
            <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in to placement portal'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          New to ZSkillup?{' '}
          <Link href="/signup" className="font-medium text-orange hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fc]">
      {/* Top bar */}
      <header className="flex h-14 items-center border-b border-slate-200 bg-white px-6 shadow-sm">
        <Link href="/" className="flex items-center gap-0.5 text-xl font-extrabold">
          <span className="text-orange">Z</span>
          <span className="text-navy">Skillup</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Sign in
            </p>
            <h1 className="mt-1 text-2xl font-bold text-navy">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pick your role, drop in your email, and we&apos;ll take you to your workspace.
            </p>
          </div>

          {/* useSearchParams requires Suspense in Next.js App Router */}
          <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-xs text-slate-400">
            © 2026 ZSkillup · Future-ready graduates, future-strong institutions
          </p>
        </div>
      </main>
    </div>
  );
}
