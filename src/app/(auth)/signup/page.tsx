'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authRegisterSchema, type AuthRegisterDto } from '@/shared';
import { register as registerUser } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Logo } from '@/components/layout/Logo';

/**
 * Signup step 1 — personal details (STUDENT_JOURNEY_SPEC §1). react-hook-form +
 * the SHARED Zod schema (identical client/server validation). On success →
 * /signup/verify?email=… (Block 5). Phone+SMS OTP is V1 UI-only (FEATURE_BACKLOG)
 * — collected here, SMS verification deferred.
 */
export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthRegisterDto>({ resolver: zodResolver(authRegisterSchema) });

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
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fc] px-4 py-10">
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
            <p className="mt-0.5 text-sm text-slate-500">Personal details — takes under a minute.</p>
          </div>
          <div>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <FormField
                id="name"
                label="Full name (as per college ID)"
                autoComplete="name"
                error={errors.name?.message}
                {...register('name')}
              />
              <FormField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <FormField
                id="phone"
                label="Phone number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                error={errors.phone?.message}
                {...register('phone')}
              />
              <FormField
                id="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
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
