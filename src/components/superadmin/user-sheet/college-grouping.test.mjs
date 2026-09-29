/**
 * ONE COLLEGE, ONE ENTRY.
 *
 *   node --test src/components/superadmin/user-sheet/college-grouping.test.mjs
 *
 * The strings below are verbatim from a production screenshot of the College filter,
 * where a single institution filled the dropdown thirteen times:
 *
 *     Basaveshwar Engineering College (359)
 *     Basaveshwar engineering college (32)
 *     Basaveshwar Engineering college (11)
 *     BASAVESHWAR ENGINEERING COLLEGE (5)
 *     basaveshwar engineering college (2)
 *     …
 *
 * Most of those differ only in capitals. Grouping has to fold them, the label has to
 * stay a spelling a human wrote, and — the part that actually matters — choosing the
 * group has to select EVERY spelling in it, or the filter silently drops students.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { URL, fileURLToPath } from 'node:url';

const SRC = new URL('../../../', import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null;
    if (specifier.startsWith('@/')) target = new URL(specifier.slice(2), SRC);
    else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith('file:')) {
      target = new URL(specifier, context.parentURL);
    }
    if (target && !/\.[cm]?[jt]sx?$/.test(target.pathname)) {
      for (const ext of ['.ts', '/index.ts']) {
        const candidate = new URL(target.href + ext);
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { collegeOptions, filterSheetRows, EMPTY_FILTERS, NO_COLLEGE } = await import('./sheet-model.ts');
const { collegeGroupKey, groupCollegeNames } = await import('@/shared/college-name');

/** The real dropdown, verbatim: [spelling, how many students]. */
const REAL = [
  ['Basaveshwa engineering college bagalkot', 1],
  ['Basaveshwar Engeneering College Bagalkot', 1],
  ['Basaveshwar Engineer college', 1],
  ['Basaveshwar engineer college bagalakot', 1],
  ['Basaveshwar engineering collage (autonomous) bagalkot', 1],
  ['Basaveshwar engineering collage bagalkot', 1],
  ['basaveshwar engineering collage bagalkot', 1],
  ['Basaveshwar Engineering College', 359],
  ['Basaveshwar engineering college', 32],
  ['Basaveshwar Engineering college', 11],
  ['BASAVESHWAR ENGINEERING COLLEGE', 5],
  ['basaveshwar engineering college', 2],
  ['Basaveshwar Engineering College (Bagalkot, Karnataka)', 4],
  ['basaveshwar engineering college bagalakot', 1],
];

let n = 0;
const rows = REAL.flatMap(([collegeName, count]) =>
  Array.from({ length: count }, () => ({ id: `u${n++}`, fullName: 'S', email: `s${n}@x.test`, collegeName })),
);

test('the five case-only variants collapse into one entry', () => {
  const opts = collegeOptions(rows);
  const plain = opts.filter((o) => collegeGroupKey(o.name) === collegeGroupKey('Basaveshwar Engineering College'));

  assert.equal(plain.length, 1, 'case variants must not each get their own row');
  // 359 + 32 + 11 + 5 + 2 — nobody is dropped by the folding.
  assert.equal(plain[0].count, 409);
  assert.equal(plain[0].spellings, 5);
});

test('the label is the spelling most people actually wrote', () => {
  const [group] = collegeOptions(rows).filter(
    (o) => collegeGroupKey(o.name) === collegeGroupKey('Basaveshwar Engineering College'),
  );
  assert.equal(group.label ?? group.name, 'Basaveshwar Engineering College');
});

test('choosing the group selects every spelling in it', () => {
  const picked = filterSheetRows(rows, { ...EMPTY_FILTERS, college: 'Basaveshwar Engineering College' });
  assert.equal(picked.length, 409, 'filtering by the label must not drop the other spellings');
});

test('picking it by a NON-label spelling still selects the whole group', () => {
  const picked = filterSheetRows(rows, { ...EMPTY_FILTERS, college: 'BASAVESHWAR ENGINEERING COLLEGE' });
  assert.equal(picked.length, 409);
});

test('a differently-worded name is NOT folded in', () => {
  // "… College (Bagalkot, Karnataka)" carries words the others do not, so it stays
  // its own entry. Deciding those are the same institution needs the matcher's bar,
  // not a grouping key — merging on a hunch moves students between colleges.
  const opts = collegeOptions(rows);
  assert.ok(
    opts.some((o) => o.name.includes('Bagalkot, Karnataka')),
    'a name with extra identifying words keeps its own row',
  );
});

test('the dropdown shrinks from fourteen rows to the number of real colleges', () => {
  const before = new Set(REAL.map(([name]) => name)).size;
  const after = collegeOptions(rows).length;
  assert.equal(before, 14);
  assert.ok(after < before, `expected fewer than ${before} entries, got ${after}`);
});

test('"no college" still means no college', () => {
  const withBlank = [...rows, { id: 'x', fullName: 'S', email: 'x@x.test', collegeName: null }];
  assert.equal(filterSheetRows(withBlank, { ...EMPTY_FILTERS, college: NO_COLLEGE }).length, 1);
  assert.ok(!collegeOptions(withBlank).some((o) => !o.name));
});

test('grouping is case, punctuation, spacing and abbreviation insensitive', () => {
  const same = [
    'Basaveshwar Engineering College',
    'basaveshwar  engineering   college',
    'BASAVESHWAR ENGINEERING COLLEGE.',
    'Basaveshwar Engg College',
    'Basaveshwar Engineering Collage',
  ];
  const keys = new Set(same.map(collegeGroupKey));
  assert.equal(keys.size, 1, `expected one key, got ${[...keys].join(' | ')}`);
});

test('two genuinely different colleges keep different keys', () => {
  assert.notEqual(collegeGroupKey('Bangalore Institute of Technology'), collegeGroupKey('Bangalore University'));
  assert.notEqual(collegeGroupKey('Government College of Engineering'), collegeGroupKey('Government Science College'));
});

test('groupCollegeNames reports the spelling count it folded', () => {
  const groups = groupCollegeNames(
    [{ n: 'IIT Bombay' }, { n: 'iit bombay' }, { n: 'IIT BOMBAY' }, { n: 'IIT Delhi' }],
    (x) => x.n,
  );
  assert.equal(groups.length, 2);
  const bombay = groups.find((g) => g.key === collegeGroupKey('IIT Bombay'));
  assert.equal(bombay.count, 3);
  assert.equal(bombay.spellings, 3);
  assert.equal(bombay.label, 'IIT Bombay');
});
