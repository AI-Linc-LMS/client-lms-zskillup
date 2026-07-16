/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011, amended 2026-06-03).
 * Mirrored at frontend-repo/src/shared/dto/auth.dto.ts.
 *
 * Validation: **class-validator + class-transformer** (Implementation Plan §4
 * line 311 explicitly permits class-validator as the alternative to Zod;
 * documented as the chosen path in BUILD_STATUS Day 3.5 close-out).
 *
 * Frontend imports each class `import type` so the decorator runtime never
 * fires on the client; the form layer uses react-hook-form native validation
 * rules with the same constraints encoded here. The class instance itself is
 * only constructed server-side by Nest's global `ValidationPipe`.
 *
 * Auth request DTOs — STUDENT_JOURNEY_SPEC §1–2 / SECURITY_STANDARDS §3:
 * email is normalized (trim + lowercase) and unknown fields are rejected
 * (ValidationPipe `whitelist: true` + `forbidNonWhitelisted: true`).
 */
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Trim + lowercase incoming email values before validation runs. */
const normaliseEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Trim a string field if it is one (leaves non-strings alone for IsString). */
const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// ─── Register (STUDENT self-signup) ─────────────────────────────────────────

export class AuthRegisterDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(120, { message: 'Name must be 120 characters or fewer' })
  @Matches(/^[a-zA-Z .'-]+$/, { message: 'Name may contain letters and spaces only' })
  name!: string;

  @Transform(normaliseEmail)
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/[a-zA-Z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  password!: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' })
  phone!: string;
}

// ─── Verify email OTP ───────────────────────────────────────────────────────

export class AuthVerifyEmailDto {
  @Transform(normaliseEmail)
  @IsEmail()
  email!: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code' })
  code!: string;
}

// ─── Login ──────────────────────────────────────────────────────────────────

export class AuthLoginDto {
  @Transform(normaliseEmail)
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password!: string;
}

// ─── Password reset (Sprint 1) ──────────────────────────────────────────────
// Single-use, short-TTL token delivered out-of-band by email
// (SECURITY_STANDARDS §1). The /forgot-password endpoint never reveals whether
// an email is registered (anti-enumeration — same response either way).

export class AuthForgotPasswordDto {
  @Transform(normaliseEmail)
  @IsEmail()
  email!: string;
}

export class AuthResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/[a-zA-Z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  password!: string;
}

/**
 * OTP-based password reset (forgot-password flow). A 6-digit code is delivered
 * by email and entered alongside the new password. Distinct from the token
 * reset above (which stays in use for college set-password + admin-initiated
 * reset links). Scoped by email + code — anti-enumeration is preserved by a
 * uniform "invalid or expired" error for any failure.
 */
export class AuthResetPasswordOtpDto {
  @Transform(normaliseEmail)
  @IsEmail()
  email!: string;

  @Transform(trimString)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code' })
  code!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/[a-zA-Z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  password!: string;
}
