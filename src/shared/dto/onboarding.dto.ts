/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo
 * (backend-repo/src/shared & frontend-repo/src/shared). Change both together.
 *
 * Onboarding wizard DTOs — steps 2 & 3 (STUDENT_JOURNEY_SPEC §1).
 */
import { z } from 'zod';

const currentYear = 2026; // pinned; passout year range is current..+4 (spec §1, step 2)

export const onboardingCollegeSchema = z
  .object({
    state: z.string().trim().min(1, 'Select a state'),
    city: z.string().trim().min(1, 'Select a city'),
    collegeName: z.string().trim().min(1, 'Select or enter your college'),
    passoutYear: z.coerce
      .number()
      .int()
      .min(currentYear, 'Invalid passout year')
      .max(currentYear + 4, 'Invalid passout year'),
  })
  .strict();
export type OnboardingCollegeDto = z.infer<typeof onboardingCollegeSchema>;

export const onboardingTargetsSchema = z
  .object({
    serviceBased: z.array(z.string().trim().min(1)).default([]),
    productBased: z.array(z.string().trim().min(1)).default([]),
  })
  .strict()
  .refine((v) => v.serviceBased.length + v.productBased.length >= 1, {
    message: 'Select at least one target company',
    path: ['serviceBased'],
  });
export type OnboardingTargetsDto = z.infer<typeof onboardingTargetsSchema>;
