'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowRight } from 'lucide-react';
import type { AuthRegisterDto } from '@/shared';
import { register as registerUser } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { FormField } from '@/components/ui/form-field';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AuthShell } from '@/components/auth/AuthShell';
import type { LoginResult } from '@/lib/api/auth';

/**
 * Signup step 1 - personal details (STUDENT_JOURNEY_SPEC §1). Shares the same
 * split-panel shell as /login (AuthShell) so the two pages are one identity;
 * only this right-panel form differs. react-hook-form native validation rules
 * mirror the shared class-validator DTO (`AuthRegisterDto`) - the server
 * re-validates on submit. On success → /signup/verify?email=… (Block 5).
 */
export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthRegisterDto>();

  const handleGoogleSuccess = useCallback((result: LoginResult) => {
    if (!result.user.isOnboarded) {
      router.push('/signup/onboarding');
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await registerUser(values);
      router.push(`/signup/verify?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      setServerError(
        err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
            Step 1 of 3
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
            Personal details - takes under a minute.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card-lg)]">
          {/* Google first - the primary, one-tap path */}
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setServerError(msg)}
            text="continue_with"
          />

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-line)]" />
            </div>
            <div className="relative flex justify-center text-xs text-[var(--color-text-muted)]">
              <span className="bg-white px-3">or sign up with email</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormField
              id="name"
              label="Full name (as per college ID)"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 120, message: 'Name must be 120 characters or fewer' },
                pattern: {
                  value: /^[a-zA-Z .'-]+$/,
                  message: 'Name may contain letters and spaces only',
                },
              })}
            />
            <FormField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
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
              id="phone"
              label="Phone number"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register('phone', {
                required: 'Phone number is required',
                pattern: {
                  value: /^[6-9]\d{9}$/,
                  message: 'Enter a valid 10-digit Indian mobile number',
                },
              })}
            />
            <FormField
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                maxLength: { value: 128, message: 'Password must be 128 characters or fewer' },
                validate: {
                  hasLetter: (v) => /[a-zA-Z]/.test(v) || 'Password must contain a letter',
                  hasNumber: (v) => /[0-9]/.test(v) || 'Password must contain a number',
                },
              })}
            />

            {serverError ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
              >
                {serverError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-brand w-full rounded-full py-3 text-sm disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account…' : 'Continue'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--color-text-muted)]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[var(--color-brand)] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
