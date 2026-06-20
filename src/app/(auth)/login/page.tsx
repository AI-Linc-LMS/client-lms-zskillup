'use client';

import { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Loader2,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';
import type { AuthLoginDto } from '@/shared';
import { login } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { FormField } from '@/components/ui/form-field';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import type { LoginResult } from '@/lib/api/auth';

const BRAND_FEATURES = [
  { icon: BookOpen, label: 'Company-wise tracks', desc: 'TCS, Infosys, Wipro & more' },
  { icon: Zap,       label: 'Adaptive quizzing',  desc: 'Re-tunes to your accuracy' },
  { icon: Trophy,    label: 'National leaderboard', desc: 'Rank among 240,000+ students' },
  { icon: BarChart3, label: 'Cohort analytics',   desc: 'TPO heat-maps & risk alerts' },
];

const TESTIMONIAL = {
  quote:
    'The TCS NQT track is shockingly close to the actual paper. I cleared in my first attempt — the daily quests kept me consistent.',
  name: 'Aditya Krishnan',
  meta: 'VIT Vellore · CSE 2025',
  initials: 'AK',
};

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
      else if (result.user.role === 'COLLEGE_ADMIN') target = '/tpo/dashboard';
    }
    // replace() so Back doesn't return to the login page; the in-memory access
    // token is preserved (soft nav) so the destination loads its data fast.
    router.replace(target);
  }, [router, searchParams]);

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
          Drop in your email — we&apos;ll take you straight to the right workspace.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card-lg)]">
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

        {/* Google Sign-In — available for both student and admin roles */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-line)]" />
            </div>
            <div className="relative flex justify-center text-xs text-[var(--color-text-muted)]">
              <span className="bg-white px-3">or continue with</span>
            </div>
          </div>
          <GoogleSignInButton
            onSuccess={handleLoginSuccess}
            onError={(msg) => setServerError(msg)}
            text="signin_with"
          />
        </div>

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
    <div className="flex min-h-screen">
      {/* ── Left brand panel (hidden on mobile) ────────────────────────────── */}
      <aside className="relative hidden w-[42%] shrink-0 overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#101d4a] to-[#1e3a8a] text-white lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        {/* Glow orbs */}
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#f37021]/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-white/[0.06] blur-3xl" />
        {/* Dotted grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Logo */}
        <div className="relative">
          <Link href="/" className="flex items-center gap-1.5 text-2xl font-extrabold">
            <span className="text-[#f37021]">Z</span>
            <span>Skillup</span>
          </Link>
          <p className="mt-1 text-sm text-white/60">Placement preparation, simplified</p>
        </div>

        {/* Main copy */}
        <div className="relative space-y-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
              India&apos;s #1 campus prep platform
            </span>
            <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight xl:text-3xl">
              Land your first tech job with confidence.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Real previous-year questions for TCS, Infosys, Wipro, Cognizant, Capgemini and
              Accenture. 240,000+ students already inside.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {BRAND_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <f.icon className="h-4 w-4 text-white/80" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{f.label}</span>
                  <span className="text-xs text-white/60">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
            {[
              { value: '240k+', label: 'Students' },
              { value: '1,200+', label: 'Colleges' },
              { value: '82%', label: 'Placement rate' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl font-extrabold num-tab">{s.value}</p>
                <p className="text-[11px] text-white/55">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <div className="mb-2 flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, k) => (
              <Star key={k} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            ))}
          </div>
          <p className="text-sm leading-relaxed text-white/85">
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1d4ed8] to-[#0b1220] text-[11px] font-extrabold">
              {TESTIMONIAL.initials}
            </span>
            <span>
              <p className="text-sm font-semibold">{TESTIMONIAL.name}</p>
              <p className="text-xs text-white/55">{TESTIMONIAL.meta}</p>
            </span>
          </div>
        </div>
      </aside>

      {/* ── Right form panel ────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b border-[var(--color-line)] bg-white px-6 lg:hidden">
          <Link href="/" className="flex items-center gap-0.5 text-xl font-extrabold">
            <span className="text-[#f37021]">Z</span>
            <span className="text-[var(--color-ink)]">Skillup</span>
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center bg-[var(--color-bg)] px-6 py-12">
          <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-white" />}>
            <LoginForm />
          </Suspense>
        </div>

        <footer className="border-t border-[var(--color-line)] bg-white px-6 py-4 text-center text-xs text-[var(--color-text-subtle)]">
          © 2026 ZSkillup · Future-ready graduates, future-strong institutions
        </footer>
      </main>
    </div>
  );
}
