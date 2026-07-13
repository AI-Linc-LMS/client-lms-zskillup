'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { AuthRegisterDto } from '@/shared';
import { register as registerUser } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Logo } from '@/components/layout/Logo';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import type { LoginResult } from '@/lib/api/auth';

/**
 * Signup step 1 — personal details (STUDENT_JOURNEY_SPEC §1). react-hook-form
 * native validation rules mirror the constraints encoded on the shared
 * class-validator DTO (`AuthRegisterDto`) — same rules, no Zod runtime on the
 * client. The server re-validates on submit so even if the client checks are
 * disabled the contract holds. On success → /signup/verify?email=… (Block 5).
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Step 1 of 3
            </p>
            <h1 className="mt-1 text-xl font-bold text-navy">Create your account</h1>
            <p className="mt-0.5 text-sm text-slate-500">Personal details - takes under a minute.</p>
          </div>
          <div>
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
                    hasLetter: (v) =>
                      /[a-zA-Z]/.test(v) || 'Password must contain a letter',
                    hasNumber: (v) =>
                      /[0-9]/.test(v) || 'Password must contain a number',
                  },
                })}
              />

              {serverError ? (
                <p role="alert" className="text-sm text-destructive">
                  {serverError}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account…' : 'Continue'}
              </Button>
            </form>

            <div className="mt-4 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs text-slate-400">
                  <span className="bg-white px-3">or sign up with Google</span>
                </div>
              </div>
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={(msg) => setServerError(msg)}
                text="continue_with"
              />
            </div>

            <p className="mt-4 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-orange hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
