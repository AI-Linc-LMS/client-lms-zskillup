/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Media uploads — the admin asks the backend to presign a short-lived S3 PUT URL,
 * uploads the file straight to S3 from the browser, then stores the returned
 * public URL on the owning record (e.g. a live-session cover). Credentials never
 * leave the backend; the browser only ever sees a scoped, expiring upload URL.
 */
import { IsIn, IsOptional, IsString } from 'class-validator';

/** The image content-types we allow for admin cover uploads. */
export const ALLOWED_IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageContentType = (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];

/**
 * The same three formats, as the extensions a pasted URL is allowed to end in.
 *
 * WHY THE RULE IS SPELLED TWICE. An upload goes through the presign path above, which
 * checks the content-type of the bytes being sent. A URL typed or pasted into a form
 * never does -- nothing about it has been uploaded -- so the only thing available to
 * check is the URL itself. A link to a PDF, to a Drive viewer page, or to a bare domain
 * saves happily and then renders as a broken image on a public page, which is the kind
 * of defect nobody notices until a candidate does.
 *
 * A query string or fragment may follow the extension, so a presigned S3 link or a CDN
 * url carrying a cache key still passes. This cannot prove the bytes are an image --
 * only fetching them could -- and it is not meant to: it catches the mistake a human
 * makes, not an attacker, who is in any case bounded by this value only ever being
 * rendered as an <img> src.
 */
export const IMAGE_URL_PATTERN = /\.(jpe?g|png|webp)(?:[?#]|$)/i;

/** The same list in words, for a validation message and for form hint text. */
export const IMAGE_URL_FORMATS = 'JPG, PNG or WebP';

/** Documents an admin may attach to a posting. PDF only: a Word file renders
 *  differently on every machine and cannot be shown inline in a browser. */
export const ALLOWED_DOC_CONTENT_TYPES = ['application/pdf'] as const;
export type AllowedDocContentType = (typeof ALLOWED_DOC_CONTENT_TYPES)[number];

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  ...ALLOWED_IMAGE_CONTENT_TYPES,
  ...ALLOWED_DOC_CONTENT_TYPES,
] as const;

/** What the uploaded image is for — drives the S3 key prefix. All land under the
 *  publicly-readable `live-sessions/` umbrella (the only prefix the bucket policy
 *  exposes for public read). */
export const MEDIA_UPLOAD_PURPOSES = [
  'live-session-cover',
  'blog-cover',
  'speaker-photo',
  /** A job description PDF. Public by design - a JD is meant to be read by anyone
   *  who opens the posting. */
  'job-jd',
  /** A company logo image on a job posting. Public - a logo is brand art. */
  'job-logo',
  /** A candidate's uploaded resume PDF, on a job application. Stored at an
   *  unguessable-UUID key so the URL is not discoverable, but note this prefix is
   *  world-READABLE if the URL leaks (the standard job-board tradeoff). Product
   *  decision (2026-08) to allow resume upload; harden to a private prefix +
   *  signed download if stronger confidentiality is required. */
  'resume',
] as const;
export type MediaUploadPurpose = (typeof MEDIA_UPLOAD_PURPOSES)[number];

// ── Request ─────────────────────────────────────────────────────────────────

export class PresignUploadDto {
  /** MIME type of the file about to be uploaded — must be an allowed image type. */
  @IsString()
  @IsIn(ALLOWED_UPLOAD_CONTENT_TYPES as unknown as string[])
  contentType!: AllowedImageContentType | AllowedDocContentType;

  /** Upload purpose (default: live-session-cover). Determines the object prefix. */
  @IsOptional()
  @IsIn(MEDIA_UPLOAD_PURPOSES as unknown as string[])
  purpose?: MediaUploadPurpose;
}

// ── Response ────────────────────────────────────────────────────────────────

export interface PresignUploadResultDto {
  /** Presigned S3 PUT URL — the browser uploads the raw file body here. */
  uploadUrl: string;
  /** The permanent, public URL to store on the record once the PUT succeeds. */
  publicUrl: string;
  /** The object key (path) inside the bucket. */
  key: string;
  /** How long `uploadUrl` stays valid, in seconds. */
  expiresInSeconds: number;
}
