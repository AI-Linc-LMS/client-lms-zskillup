/**
 * Admin-authored page CONTENT for the SEO module — the body copy on a landing page,
 * as opposed to its <head> metadata.
 *
 * Why this exists: the pSEO surface (81 company x feature pages, the company hubs,
 * the section and module pages) rendered body copy that lived only in code. An
 * operator could retitle a page but not write a word on it, so every content change
 * was a deploy. This is the content half of the same row.
 *
 * Shared because BOTH repos must agree on the shape (ADR-011, byte-identical):
 * the backend validates on write, the frontend validates again on render. That
 * second pass is not belt-and-braces — a jsonb column accepts anything any writer
 * puts there (a script, a psql session, a future endpoint), and a malformed row
 * must render as nothing rather than crash a statically-generated page.
 *
 * Content is TEXT, never markup. The renderer prints strings into text nodes and
 * splits paragraphs on blank lines; nothing here is ever fed to innerHTML. That is
 * deliberate: this field is editable by any ADMIN, and a stored-XSS sink on a page
 * served to every logged-out visitor is the worst shape this feature could take.
 */

/** One question/answer pair — rendered as a <details> row AND as FAQPage JSON-LD. */
export interface SeoFaq {
  q: string;
  a: string;
}

/** One admin-authored content block: a heading, prose, and optional bullets. */
export interface SeoContentSection {
  title: string;
  /** Prose. Blank lines separate paragraphs; no markup is interpreted. */
  body: string;
  bullets?: string[];
}

/**
 * The editable body of one page. Every field is optional — a page with only FAQs
 * is a normal and useful state.
 */
export interface SeoPageContent {
  /** Overrides the page H1. Template tokens are substituted at render time. */
  heading?: string | null;
  /** Overrides the lead paragraph under the H1. */
  intro?: string | null;
  /** Appended after the data-derived sections, in order. */
  sections?: SeoContentSection[];
  /** Rendered as an FAQ section and emitted as FAQPage structured data. */
  faqs?: SeoFaq[];
}

/**
 * Caps, enforced on write and again on render.
 *
 * These are not arbitrary. An unbounded jsonb body on a prerendered page is a build-time
 * memory risk and an open invitation to keyword-stuff a page into a manual action; the
 * section and FAQ counts are set where a real page stops being readable.
 */
export const SEO_CONTENT_LIMITS = {
  heading: 200,
  intro: 1200,
  sectionTitle: 160,
  sectionBody: 4000,
  bullet: 300,
  bulletsPerSection: 12,
  sections: 12,
  faqQuestion: 300,
  faqAnswer: 2000,
  faqs: 20,
} as const;

/** Trim, collapse CR, and cap. Returns '' for anything that is not a usable string. */
function text(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').trim().slice(0, max);
}

/**
 * Coerce unknown input into a valid `SeoPageContent`, or `null` when it carries no
 * content at all.
 *
 * Returning `null` for empty is what makes clearing work: the admin empties the
 * fields, this returns null, and the column goes back to NULL rather than storing
 * `{"sections":[]}` — which would read as "has content" to every `!= null` check.
 *
 * Never throws. Unknown keys, wrong types and over-long strings are dropped or
 * truncated, not rejected, so one bad field cannot blank a page that is otherwise fine.
 */
export function normaliseSeoContent(input: unknown): SeoPageContent | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;

  const heading = text(raw.heading, SEO_CONTENT_LIMITS.heading);
  const intro = text(raw.intro, SEO_CONTENT_LIMITS.intro);

  const sections: SeoContentSection[] = (Array.isArray(raw.sections) ? raw.sections : [])
    .slice(0, SEO_CONTENT_LIMITS.sections)
    .map((s): SeoContentSection => {
      const row = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
      const bullets = (Array.isArray(row.bullets) ? row.bullets : [])
        .slice(0, SEO_CONTENT_LIMITS.bulletsPerSection)
        .map((b) => text(b, SEO_CONTENT_LIMITS.bullet))
        .filter(Boolean);
      return {
        title: text(row.title, SEO_CONTENT_LIMITS.sectionTitle),
        body: text(row.body, SEO_CONTENT_LIMITS.sectionBody),
        ...(bullets.length ? { bullets } : {}),
      };
    })
    // A section needs a title AND something under it. A lone heading renders as a
    // dangling rule on the page and reads to a crawler as padding.
    .filter((s) => s.title && (s.body || s.bullets?.length));

  const faqs: SeoFaq[] = (Array.isArray(raw.faqs) ? raw.faqs : [])
    .slice(0, SEO_CONTENT_LIMITS.faqs)
    .map((f): SeoFaq => {
      const row = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>;
      return {
        q: text(row.q, SEO_CONTENT_LIMITS.faqQuestion),
        a: text(row.a, SEO_CONTENT_LIMITS.faqAnswer),
      };
    })
    // Both halves required: Google treats an FAQPage entry with an empty answer as
    // invalid structured data for the WHOLE page, not just that entry.
    .filter((f) => f.q && f.a);

  if (!heading && !intro && !sections.length && !faqs.length) return null;

  return {
    ...(heading ? { heading } : {}),
    ...(intro ? { intro } : {}),
    ...(sections.length ? { sections } : {}),
    ...(faqs.length ? { faqs } : {}),
  };
}

/** True when the content has nothing a page would render. */
export function isSeoContentEmpty(c: SeoPageContent | null | undefined): boolean {
  return !c || !(c.heading || c.intro || c.sections?.length || c.faqs?.length);
}

/**
 * Substitute `{company}` / `{year}` / `{section}`-style tokens through every string in
 * the content, so one template row can serve a whole page family the way the metadata
 * templates already do.
 */
export function fillSeoContent(
  content: SeoPageContent,
  vars: Record<string, string>,
): SeoPageContent {
  const fill = (s: string) =>
    Object.entries(vars).reduce((acc, [name, value]) => acc.split(`{${name}}`).join(value), s);
  return {
    ...(content.heading ? { heading: fill(content.heading) } : {}),
    ...(content.intro ? { intro: fill(content.intro) } : {}),
    ...(content.sections?.length
      ? {
          sections: content.sections.map((s) => ({
            title: fill(s.title),
            body: fill(s.body),
            ...(s.bullets?.length ? { bullets: s.bullets.map(fill) } : {}),
          })),
        }
      : {}),
    ...(content.faqs?.length
      ? { faqs: content.faqs.map((f) => ({ q: fill(f.q), a: fill(f.a) })) }
      : {}),
  };
}
