/**
 * Type-only stand-in for `@nestjs/swagger`, which is a backend dependency only.
 *
 * Shared DTOs are mirrored byte-for-byte from the backend (ADR-011), and a few of them
 * (e.g. src/shared/dto/scheduled-assessment.dto.ts) decorate their response classes with
 * `@ApiProperty`. The frontend only ever imports those files with `import type`, so the
 * decorators never run here; this declaration just lets `tsc` check the mirrored file
 * without adding the package. Importing a VALUE from such a DTO in client code would still
 * fail the build loudly (the module does not exist at runtime), which is intended.
 */
declare module '@nestjs/swagger' {
  export function ApiProperty(options?: Record<string, unknown>): PropertyDecorator;
  export function ApiPropertyOptional(options?: Record<string, unknown>): PropertyDecorator;
}
