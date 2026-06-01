'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { authVerifyEmailSchema, type AuthVerifyEmailDto } from '@/shared';
import { verifyEmail } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Logo } from '@/components/layout/Logo';

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthVerifyEmailDto>({
    resolver: zodResolver(authVerifyEmailSchema),
    defaultValues: { email },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await verifyEmail(values);
      router.push('/signup/onboarding');
    } catch (err) {
      setServerError(
        err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.',
      );
    }
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-orange/10">
          <Mail className="size-5 text-orange" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Step 1b · Email verification
          </p>
          <h1 className="text-xl font-bold text-navy">Verify your email</h1>
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Enter the 6-digit code we sent to{' '}
        <span className="font-semibold text-navy">{email || 'your email'}</span>.
      </p>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" {...register('email')} />
        <FormField
          id="code"
          label="Verification code"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="123456"
          error={errors.code?.message}
          {...register('code')}
        />
        {serverError ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400">
        Didn&apos;t get a code? Check spam, or wait 60 seconds and request a new one.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fc] px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />
          }
        >
          <VerifyForm />
        </Suspense>
      </div>
    </main>
  );
}
