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
