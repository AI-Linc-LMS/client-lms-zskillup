import { JsonLd, faqLd } from '@/components/seo/JsonLd';
import type { SeoPageContent } from '@/shared/seo-content';

/**
 * Admin-authored body copy on a public landing page — the sections and FAQs written in
 * the SEO module, rendered below whatever the page derives from real data.
 *
 * TEXT, NEVER MARKUP. Every string lands in a text node; paragraphs come from splitting
 * on blank lines, not from interpreting anything. This field is editable by any ADMIN and
 * these pages are served to every logged-out visitor, so `dangerouslySetInnerHTML` here
 * would be a stored-XSS sink on the most-trafficked surface in the product. If rich
 * formatting is ever wanted, it goes through a sanitising renderer, not through this file.
 *
 * Server components: static markup over an already-cached fetch, and these pages must
 * stay prerendered.
 */

/** Blank-line-separated prose -> paragraphs. */
function Prose({ body }: { body: string }) {
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          {p}
        </p>
      ))}
    </>
  );
}

/** The admin's extra content sections. Renders nothing when there are none. */
export function PageSections({ content }: { content: SeoPageContent | null }) {
  if (!content?.sections?.length) return null;
  return (
    <>
      {content.sections.map((s, i) => (
        <section key={`${i}-${s.title}`}>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">{s.title}</h2>
          <div className="mt-4 space-y-3">
            {s.body && <Prose body={s.body} />}
            {s.bullets?.length ? (
              <ul className="max-w-3xl space-y-2">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}
    </>
  );
}

/**
 * The FAQ block plus its FAQPage structured data.
 *
 * `<details>` rather than a JS accordion: keyboard-operable and screen-reader-navigable
 * with no client bundle, and the answer text is in the DOM for a crawler whether or not
 * the row is open — a JS-gated answer is not indexed and would make the JSON-LD a claim
 * about content the page does not show, which is a manual-action risk.
 */
export function PageFaqs({ content, heading = 'Frequently asked questions' }: {
  content: SeoPageContent | null;
  heading?: string;
}) {
  if (!content?.faqs?.length) return null;
  return (
    <section>
      <JsonLd data={faqLd(content.faqs)} />
      <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">{heading}</h2>
      <div className="mt-4 max-w-3xl divide-y divide-[var(--color-line)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-sm">
        {content.faqs.map((f, i) => (
          <details key={`${i}-${f.q}`} className="group">
            <summary className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4 text-sm font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted,#f8fafc)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]">
              <span>{f.q}</span>
              <span
                aria-hidden
                className="mt-0.5 shrink-0 text-lg font-normal leading-none text-[var(--color-text-subtle)] transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="px-5 pb-4 pt-0">
              <Prose body={f.a} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
