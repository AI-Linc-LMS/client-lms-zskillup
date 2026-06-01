/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo
 * (backend-repo/src/shared & frontend-repo/src/shared). Change both together.
 *
 * Auth request DTOs (STUDENT_JOURNEY_SPEC §1–2). Validation is identical on
 * client (react-hook-form) and server (ZodValidationPipe), SECURITY_STANDARDS §3:
 * normalize email (trim + lowercase), reject unknown fields (.strict()).
 */
import { z } from 'zod';

const email = z.string().trim().toLowerCase().email();
/** Min 8 chars with some complexity (SECURITY_STANDARDS §1 / spec §1). */
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-zA-Z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const authRegisterSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name is required')
      .max(120)
      .regex(/^[a-zA-Z .'-]+$/, 'Name may contain letters and spaces only'),
    email,
    password,
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  })
  .strict();
export type AuthRegisterDto = z.infer<typeof authRegisterSchema>;

export const authVerifyEmailSchema = z
  .object({
    email,
    code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  })
  .strict();
export type AuthVerifyEmailDto = z.infer<typeof authVerifyEmailSchema>;

export const authLoginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Password is required'),
  })
  .strict();
export type AuthLoginDto = z.infer<typeof authLoginSchema>;
