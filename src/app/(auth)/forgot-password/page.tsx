'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Mail } from 'lucide-react';
import type { AuthForgotPasswordDto } from '@/shared';
import { forgotPassword } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Logo } from '@/components/layout/Logo';

/**
 * Forgot password. Submitting calls `POST /auth/forgot-password`, which always
 * returns the same response regardless of whether the email exists
 * (anti-enumeration). We then route to /reset-password with the email so the
 * user can enter the 6-digit code we emailed and set a new password — mirroring
 * the signup email-verification flow. The code screen is shown regardless of
 * whether the account exists (it simply never arrives otherwise).
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthForgotPasswordDto>();

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await forgotPassword(values);
      router.push(`/reset-password?email=${encodeURIComponent(values.email)}`);
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
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-orange/10">
              <Mail className="size-5 text-orange" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Account recovery
              </p>
              <h1 className="text-xl font-bold text-navy">Reset your password</h1>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <p className="text-sm text-slate-600">
              Enter the email you registered with and we&apos;ll send you a 6-digit code to set a
              new password.
            </p>
            <FormField
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
            />
            {serverError ? (
              <p
                role="alert"
                className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
              >
                {serverError}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send reset code'}
            </Button>
            <p className="text-center text-sm text-slate-600">
              Remembered it?{' '}
              <Link href="/login" className="font-semibold text-orange hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
