'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Mail } from 'lucide-react';
import type { AuthForgotPasswordDto } from '@/shared';
import { forgotPassword } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Logo } from '@/components/layout/Logo';

/**
 * Forgot password — Sprint 1 deliverable. Submitting calls
 * `POST /auth/forgot-password`, which always returns the same response shape
 * regardless of whether the email exists (anti-enumeration).
 *
 * The user is told to check their email; the dev transport surfaces the reset
 * link via the backend server log so a developer can complete the flow.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
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
      setSent(true);
    } catch (err) {
      setServerError(
        err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fc] px-4 py-10">
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
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Account recovery
              </p>
              <h1 className="text-xl font-bold text-navy">Reset your password</h1>
            </div>
          </div>

          {sent ? (
            <div className="space-y-4">
              <p className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
                If an account exists for that email, a reset link has been sent. It expires in 1 hour.
              </p>
              <p className="text-xs text-slate-500">
                Didn&apos;t get the email? Check spam, or try again in a few minutes.
              </p>
              <Link
                href="/login"
                className="block text-center text-sm font-semibold text-orange hover:underline"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <p className="text-sm text-slate-500">
                Enter the email you registered with and we&apos;ll send you a link to set a new password.
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
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
              <p className="text-center text-sm text-slate-500">
                Remembered it?{' '}
                <Link href="/login" className="font-semibold text-orange hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
