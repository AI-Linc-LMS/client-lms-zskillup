/**
 * Tests for the question-bank taxonomy logic that has no UI to catch it: the coding
 * section's payload name (which has to survive the server's 120-char limit), the tree the
 * bank console's section/topic filter is built from, and the UNKNOWN_COMPANY parser the
 * coding companies editor reads its error from. Zero-dependency: Node's built-in test
 * runner with native type stripping (Node >= 22.18):
 *
 *   node --test src/components/superadmin/assessment-wizard/selection.test.mjs
 *
 * The modules under test use the app's `@/` alias and extensionless relative imports, so
 * a resolve hook maps those to the .ts files first; the modules are then loaded with a
 * dynamic import (a static one would be resolved before the hook exists).
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

const { LIMITS, toPayloadSections } = await import('./selection.ts');
const { buildTopicOptions } = await import('./topic-tree.ts');
const { CODING_SECTION_LABEL } = await import('@/shared/question-taxonomy');
const { UNKNOWN_COMPANY, unknownCompaniesFrom } = await import('@/lib/api/coding');
const { ApiRequestError } = await import('@/lib/api/types');

const section = (over) => ({ key: 's1', name: 'Aptitude', mcqMarks: 1, codingMarks: 2, items: [], draws: [], ...over });
const mcq = (id) => ({ id, type: 'MCQ', label: id, difficulty: 'EASY', origin: 'MANUAL' });
const coding = (id) => ({ id, type: 'CODING', label: id, difficulty: 'HARD', origin: 'MANUAL' });

// ── payload section names ───────────────────────────────────────────────────

test('the coding half of a mixed section is labelled with the full section label', () => {
  const out = toPayloadSections([section({ items: [mcq('q1'), coding('p1')] })]);
  assert.deepEqual(
    out.map((s) => s.name),
    ['Aptitude', `Aptitude · ${CODING_SECTION_LABEL}`],
  );
  assert.deepEqual(out[0].questionIds, ['q1']);
  assert.deepEqual(out[1].codingProblemIds, ['p1']);
});

test('a coding-only section keeps its name untouched', () => {
  const [only] = toPayloadSections([section({ name: 'DSA round', items: [coding('p1')] })]);
  assert.equal(only.name, 'DSA round');
});

test('every payload name fits the server limit, even for a max-length section name', () => {
  // The name input caps at 100 chars; 200 proves the slice, not the input.
  for (const len of [90, 100, LIMITS.sectionName, 200]) {
    const name = 'N'.repeat(len);
    const out = toPayloadSections([section({ name, items: [mcq('q1'), coding('p1')] })]);
    const codingName = out[1].name;
    assert.ok(
      codingName.length <= LIMITS.sectionName,
      `coding name for a ${len}-char section is ${codingName.length} chars`,
    );
    assert.ok(codingName.endsWith(CODING_SECTION_LABEL), 'the label is never truncated away');
  }
});

// ── section/topic filter tree ───────────────────────────────────────────────

const topic = (id, slug, parentId, questionCount) => ({ id, slug, name: slug, parentId, questionCount });
const TREE = [
  topic('t1', 'quantitative-aptitude', null, 0),
  topic('t2', 'percentages', 't1', 4),
  topic('t3', 'profit-loss', 't2', 2),
  topic('t4', 'empty-section', null, 0),
  topic('t5', 'ai-practice-topics', null, 0),
  topic('t6', 'graph-colouring', 't5', 3),
];

test('the wizard pickers keep the student view: no hidden root, no empty branch', () => {
  const ids = buildTopicOptions(TREE).map((o) => o.id);
  assert.deepEqual(ids, ['t1', 't2', 't3']);
});

test('the bank console reaches every depth, empty branches and the ad-hoc root included', () => {
  const opts = buildTopicOptions(TREE, { keepEmpty: true, keepHiddenRoots: true });
  assert.deepEqual(
    opts.map((o) => o.id),
    ['t5', 't6', 't4', 't1', 't2', 't3'],
  );
  const leaf = opts.find((o) => o.id === 't3');
  assert.equal(leaf.depth, 2);
  assert.equal(leaf.path, 'quantitative-aptitude › percentages › profit-loss');
});

test('keepEmpty alone still hides the ad-hoc root', () => {
  const ids = buildTopicOptions(TREE, { keepEmpty: true }).map((o) => o.id);
  assert.equal(ids.includes('t5'), false);
  assert.equal(ids.includes('t4'), true);
});

// ── UNKNOWN_COMPANY parsing ─────────────────────────────────────────────────

test('unknownCompaniesFrom reads the slugs the server named', () => {
  const err = new ApiRequestError(400, {
    code: UNKNOWN_COMPANY,
    message: 'Unknown company',
    details: { unknown: ['adobe', 'flipkart'] },
  });
  assert.deepEqual(unknownCompaniesFrom(err), ['adobe', 'flipkart']);
});

test('unknownCompaniesFrom returns [] when the error carries no slug list', () => {
  assert.deepEqual(unknownCompaniesFrom(new ApiRequestError(400, { code: UNKNOWN_COMPANY })), []);
});

test('unknownCompaniesFrom returns null for any other failure', () => {
  assert.equal(unknownCompaniesFrom(new Error('offline')), null);
  assert.equal(
    unknownCompaniesFrom(
      new ApiRequestError(400, { code: 'VALIDATION_FAILED', details: { companies: ['should not exist'] } }),
    ),
    null,
  );
});
