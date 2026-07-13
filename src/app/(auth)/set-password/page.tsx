'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { KeyRound } from 'lucide-react';
import type { AuthResetPasswordDto } from '@/shared';
import { resetPassword } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Logo } from '@/components/layout/Logo';

/**
 * Set-password (college onboarding — Batch 3). A provisioned account (e.g. a
 * college TPO admin) opens the secure link from their set-up email; setting the
 * password here verifies + activates the account (server-side). Reuses the
 * reset-password endpoint (same single-use token contract) with welcome copy.
 */
function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
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
      router.push('/login?welcome=1');
    } catch (err) {
      setServerError(
        err instanceof ApiRequestError
          ? err.message
          : 'Could not set your password. The link may have expired - ask your admin to resend it.',
      );
    }
  });

  if (!token) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-navy">Set-up link missing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Open the link from your account set-up email. If it&apos;s expired, ask your admin to resend it.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-orange hover:underline">
          Go to login →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-orange/10">
          <KeyRound className="size-5 text-orange" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Welcome to ZSkillup</p>
          <h1 className="text-xl font-bold text-navy">Set your password</h1>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" {...register('token', { required: true })} value={token} />
        <FormField
          id="password"
          label="Create a password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters, letters and numbers"
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
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Set password & continue'}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">You&apos;ll use this password to sign in from now on.</p>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Suspense
          fallback={<div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}
        >
          <SetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
