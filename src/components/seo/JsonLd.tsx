/**
 * Emits one schema.org block as JSON-LD.
 *
 * Rendered server-side into the page body, which Google reads the same as one in <head>.
 * `dangerouslySetInnerHTML` is the only way to emit a <script> body in React, so the
 * payload is serialised here rather than interpolated from anything a visitor controls —
 * every caller in this repo builds it from our own catalogue data.
 *
 * `<` is escaped because a literal `</script>` inside the JSON would close the tag early
 * and spill the rest into the document. No title contains one today; that is not a reason
 * to let the next one break the page.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

const SITE = 'https://prephasz.com';

/** Home › … trail. Positions are 1-based and MUST match the visible breadcrumb — markup
 *  that disagrees with the page is a manual-action risk, not a clever shortcut. */
export function breadcrumbLd(trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${SITE}${t.path}`,
    })),
  };
}

/** An index page's children, in the order they are rendered. */
export function itemListLd(name: string, items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: `${SITE}${it.path}`,
    })),
  };
}

/**
 * Site-level identity, emitted on EVERY page from the root layout.
 *
 * `WebSite` + `name` is what Google reads to decide the site name it prints above a
 * result — the one part of this block that still earns its place.
 *
 * `potentialAction`/`SearchAction` is the sitelinks-searchbox markup. Google retired
 * that feature on 2024-11-21 and no longer renders a search box for it, so this is
 * kept for the other consumers that read schema.org (Bing, LLM crawlers) and because
 * Google states unsupported types cause no harm — NOT because it will produce a
 * search box. The target points at /practice?q=, which is a real, working search URL;
 * markup that names a URL the site cannot serve is the version worth avoiding.
 */
export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Prephasz',
    alternateName: 'ZSkillup',
    url: `${SITE}/`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE}/practice?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Visible Q&A, marked up.
 *
 * The questions and answers passed here MUST be the ones rendered on the page. Marking up
 * FAQs the visitor cannot see is the definition of hidden structured data and is a
 * manual-action risk, not a shortcut to a richer result.
 */
export function faqLd(items: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}
