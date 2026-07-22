/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011, amended 2026-06-03).
 * Mirrored at frontend-repo/src/shared/dto/onboarding.dto.ts.
 *
 * Onboarding wizard DTOs - steps 2 & 3 (STUDENT_JOURNEY_SPEC §1).
 */
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

const currentYear = 2026; // pinned; passout year range is current..+4 (spec §1, step 2)

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Cross-field validator: at least one of (serviceBased | productBased) must be non-empty. */
function AtLeastOneTarget(options?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol): void {
    registerDecorator({
      name: 'atLeastOneTarget',
      target: object.constructor,
      propertyName: propertyName as string,
      options: { message: 'Select at least one target company', ...options },
      validator: {
        validate(_value, args): boolean {
          if (!args) return false;
          const dto = args.object as OnboardingTargetsDto;
          return (
            (dto.serviceBased?.length ?? 0) + (dto.productBased?.length ?? 0) >= 1
          );
        },
      },
    });
  };
}

export class OnboardingCollegeDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1, { message: 'Select a state' })
  state!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1, { message: 'Select a city' })
  city!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1, { message: 'Select or enter your college' })
  collegeName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(currentYear, { message: 'Invalid passout year' })
  @Max(currentYear + 4, { message: 'Invalid passout year' })
  passoutYear!: number;
}

const trimList = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== '')
    : value;

/** Profile-completion step - phone, course, year of study, skills, roles. */
export class OnboardingProfileDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(160)
  course?: string;

  // Free-form category, not a number: "1st year"…"5th year", "Graduate",
  // "Working professional", "Not applicable" or blank. Coerce legacy numeric
  // values to strings so older clients keep working (mirrors the backend DTO).
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : String(value)))
  @IsString()
  @MaxLength(40)
  yearOfStudy?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  @Transform(trimList)
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @Transform(trimList)
  rolesInterested?: string[];
}

export class OnboardingTargetsDto {
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)) : value,
  )
  @AtLeastOneTarget()
  serviceBased: string[] = [];

  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)) : value,
  )
  productBased: string[] = [];
}
