'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Mail, Sparkles } from 'lucide-react';
import type { AuthVerifyEmailDto } from '@/shared';
import { verifyEmail } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Logo } from '@/components/layout/Logo';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const IS_DEV = process.env.NODE_ENV !== 'production';

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AuthVerifyEmailDto>({
    defaultValues: { email },
  });

  /**
   * Dev-only convenience: pull the OTP straight from the backend's in-memory
   * store (`GET /auth/_dev/last-otp`) and pre-fill the form. The endpoint is
   * gated to `NODE_ENV !== 'production'` on the backend — in prod it 404s and
   * this button has no effect. Means a developer can complete signup without
   * Mailhog / SMTP running.
   */
  const fetchDevOtp = async () => {
    if (!email) return;
    setDevLoading(true);
    setDevHint(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/auth/_dev/last-otp?email=${encodeURIComponent(email)}`,
      );
      if (!res.ok) {
        setDevHint('No OTP found — try registering again, or check your inbox.');
        return;
      }
      const json = (await res.json()) as { data?: { code?: string } };
      const code = json.data?.code;
      if (code) {
        setValue('code', code, { shouldValidate: true });
        setDevHint(`Code ${code} filled in. Click Verify to continue.`);
      }
    } catch {
      setDevHint('Dev endpoint unreachable.');
    } finally {
      setDevLoading(false);
    }
  };

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
        <input type="hidden" {...register('email', { required: true })} />
        <FormField
          id="code"
          label="Verification code"
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

      {IS_DEV ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">
                Dev mode
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                SMTP not wired? Click below to pull the OTP from the backend dev store
                and pre-fill it. This shortcut is disabled in production.
              </p>
              <button
                type="button"
                onClick={fetchDevOtp}
                disabled={devLoading || !email}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {devLoading ? 'Fetching…' : 'Fetch dev OTP'}
              </button>
              {devHint ? (
                <p className="mt-2 text-xs text-amber-800">{devHint}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
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
