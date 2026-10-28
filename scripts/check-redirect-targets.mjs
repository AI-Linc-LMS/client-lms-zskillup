/**
 * Every `appHref` in the shared feature catalogues must be a route this app actually has.
 *
 * These values are what `?redirect=` carries from the public pages, so a wrong one is
 * invisible until a real visitor signs up and lands on a 404 — sanitizeRedirect accepts
 * it happily, because it is a well-formed same-site path. Two were wrong when this check
 * was first run (`/resume` and `/placement-readiness`, neither of which exists).
 *
 * Run AFTER `next build`, which writes the manifest this reads:
 *   node scripts/check-redirect-targets.mjs
 */
import { readFileSync } from 'node:fs';

const MANIFEST = '.next/app-path-routes-manifest.json';

let routes;
try {
  routes = new Set(Object.values(JSON.parse(readFileSync(MANIFEST, 'utf8'))));
} catch {
  console.error(`Could not read ${MANIFEST} — run \`next build\` first.`);
  process.exit(2);
}

const src = readFileSync('src/shared/product-features.ts', 'utf8');
const hrefs = [...src.matchAll(/appHref: '([^']+)'/g)].map((m) => m[1]);

const missing = hrefs.filter((h) => !routes.has(h));
for (const h of hrefs) console.log(`${missing.includes(h) ? 'MISSING' : 'ok     '}  ${h}`);

if (missing.length) {
  console.error(`\n${missing.length} redirect target(s) do not exist: ${missing.join(', ')}`);
  console.error('A visitor signing up from that feature page would land on a 404.');
  process.exit(1);
}
console.log(`\nAll ${hrefs.length} redirect targets resolve.`);
