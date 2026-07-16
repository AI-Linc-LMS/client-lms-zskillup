'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Lock } from 'lucide-react';
import type { AuthResetPasswordDto, AuthResetPasswordOtpDto } from '@/shared';
import { resetPassword, resetPasswordOtp } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Logo } from '@/components/layout/Logo';

/**
 * Reset password. Two modes:
 *  - OTP (default): the forgot-password flow. The email is carried via `?email=`
 *    and the user enters the 6-digit code we emailed plus a new password →
 *    `POST /auth/reset-password-otp`.
 *  - Token (`?token=…`): the college set-password / admin-initiated reset links,
 *    which carry a single-use token → `POST /auth/reset-password` (unchanged).
 * On success the user is redirected to /login with a flash message.
 */
function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  return token ? <TokenResetForm token={token} /> : <OtpResetForm email={email} />;
}

const passwordRules = {
  required: 'Password is required',
  minLength: { value: 8, message: 'Password must be at least 8 characters' },
  maxLength: { value: 128, message: 'Password must be 128 characters or fewer' },
  validate: {
    hasLetter: (v: string) => /[a-zA-Z]/.test(v) || 'Password must contain a letter',
    hasNumber: (v: string) => /[0-9]/.test(v) || 'Password must contain a number',
  },
} as const;

function CardHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-full bg-orange/10">
        <Lock className="size-5 text-orange" aria-hidden="true" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Account recovery
        </p>
        <h1 className="text-xl font-bold text-navy">{title}</h1>
      </div>
    </div>
  );
}

/** OTP flow — the forgot-password path. */
function OtpResetForm({ email }: { email: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthResetPasswordOtpDto>({
    defaultValues: { email, code: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await resetPasswordOtp(values);
      router.push('/login?reset=ok');
    } catch (err) {
      setServerError(
        err instanceof ApiRequestError
          ? err.message
          : 'Could not reset your password. The code may have expired.',
      );
    }
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <CardHeader title="Set a new password" />
      <p className="mb-4 text-sm text-slate-600">
        Enter the 6-digit code we emailed{' '}
        {email ? <span className="font-semibold text-navy">{email}</span> : 'you'} and choose a new
        password.
      </p>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
        <FormField
          id="code"
          label="Reset code"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="123456"
          error={errors.code?.message}
          {...register('code', {
            required: 'Enter the 6-digit code',
            pattern: { value: /^\d{6}$/, message: 'Enter the 6-digit code' },
          })}
        />
        <FormField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters, letters and numbers"
          error={errors.password?.message}
          {...register('password', passwordRules)}
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
          {isSubmitting ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Didn&apos;t get a code?{' '}
        <Link href="/forgot-password" className="font-semibold text-orange hover:underline">
          Request a new one
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">
        Once your password is updated, all active sessions are signed out.
      </p>
    </div>
  );
}

/** Token flow — college set-password / admin-initiated reset links. */
function TokenResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthResetPasswordDto>({
    defaultValues: { token, password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await resetPassword({ ...values, token });
      router.push('/login?reset=ok');
    } catch (err) {
      setServerError(
        err instanceof ApiRequestError
          ? err.message
          : 'Could not reset your password. The link may have expired.',
      );
    }
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <CardHeader title="Set a new password" />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" {...register('token', { required: true })} value={token} />
        <FormField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters, letters and numbers"
          error={errors.password?.message}
          {...register('password', passwordRules)}
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
          {isSubmitting ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        Once your password is updated, all active sessions are signed out.
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
          }
        >
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
