/**
 * Tests for the student-result export columns: the owner's CSV format — fifteen fixed
 * columns, then a "Section-wise Scores-<S>" / "Section-wise Max Scores-<S>" pair per
 * section of the paper, generated from the assessment rather than hard-coded.
 *
 * Zero-dependency: Node's built-in test runner with native type stripping (Node >=
 * 22.18):
 *
 *   node --test src/lib/results-export-rows.test.mjs
 *
 * The module under test uses the app's `@/` alias and extensionless imports, so a
 * resolve hook maps those to the .ts files first; the module is then loaded with a
 * dynamic import (a static one would be resolved before the hook exists).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { URL, fileURLToPath } from 'node:url';

const SRC = new URL('../', import.meta.url);

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

const {
  FIXED_RESULT_COLUMNS,
  RESULTS_MODAL_COLUMNS,
  TEST_REPORT_COLUMNS,
  buildResultsCsv,
  resultsCsvBody,
  resultSections,
  resultsColumns,
  resultsRows,
} = await import('./results-export-rows.ts');
const { CSV_BOM } = await import('./csv.ts');

/** The three sections of the owner's sample paper, in the paper's order. */
const SECTIONS = [
  { name: 'Aptitude', maxMarks: 20, order: 0 },
  { name: 'Case Study', maxMarks: 15, order: 20 },
  { name: 'Common Management', maxMarks: 10, order: 35 },
];

function row(overrides = {}) {
  return {
    userId: 'u1',
    fullName: 'Asha Rao',
    email: 'asha@example.com',
    phone: '9876543210',
    attempted: true,
    collegeName: 'Alpha College',
    branch: 'CSE',
    cohort: null,
    score: 30,
    total: 45,
    scorePct: 67,
    rank: 1,
    passed: true,
    percentile: 90,
    startedAt: '2026-09-10T09:00:00.000Z',
    submittedAt: '2026-09-10T10:00:00.000Z',
    timeTakenSec: 3600,
    totalQuestions: 45,
    attemptedQuestions: 40,
    correctAnswers: 30,
    incorrectAnswers: 10,
    accuracy: 75,
    status: 'SUBMITTED',
    proctored: true,
    tabSwitches: 2,
    fullscreenExits: 1,
    faceViolations: 3,
    faceValidationFailures: 1,
    multipleFaceDetections: 2,
    violations: 6,
    integrityScore: 80,
    autoSubmittedByProctor: false,
    warningCount: 1,
    sections: SECTIONS.map((s) => ({ ...s, score: 0 })),
    ...overrides,
  };
}

function results(rows) {
  return {
    assessment: {
      id: 'sa-1',
      title: 'Campus Drive 2026',
      companyId: null,
      companyName: 'Platform-wide',
      collegeId: null,
      resultsReleased: true,
      cohort: null,
      scheduledAt: '2026-09-10T08:00:00.000Z',
      proctored: true,
      passingScore: 60,
      totalQuestions: 45,
      maxMarks: 45,
      passMarks: 27,
    },
    stats: { registered: 1, attempted: rows.length, avgScorePct: 67, topScorePct: 67, flagged: 1, passed: 1 },
    rows,
  };
}

/** The CSV's data lines, without the BOM, unquoted cell by cell. */
function csvLines(csv) {
  return csv
    .replace(CSV_BOM, '')
    .split('\r\n')
    .map((line) => line.split('","').map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"')));
}

test('the header is the 15 fixed columns then a score/max pair per section, in paper order', () => {
  const data = results([row()]);
  assert.deepEqual(resultsColumns(data), [
    'Name',
    'Phone',
    'Started At',
    'Submitted At',
    'Maximum Marks',
    'Overall Score',
    'Percentage',
    'Total Questions',
    'Attempted Questions',
    'Tab Switches Count',
    'Face Violations Count',
    'Fullscreen Exits Count',
    'Face Validation Failures Count',
    'Multiple Face Detections Count',
    'Total Violation Count',
    'Section-wise Scores-Aptitude',
    'Section-wise Max Scores-Aptitude',
    'Section-wise Scores-Case Study',
    'Section-wise Max Scores-Case Study',
    'Section-wise Scores-Common Management',
    'Section-wise Max Scores-Common Management',
  ]);
  // And that is exactly what the file's first line says.
  assert.deepEqual(csvLines(buildResultsCsv(data))[0], resultsColumns(data));
  assert.equal(FIXED_RESULT_COLUMNS.length, 15);
});

test('section columns follow the paper, not the alphabet, and repeat no section', () => {
  // Rows arrive with their sections in any order; two students share the same paper.
  const shuffled = [SECTIONS[2], SECTIONS[0], SECTIONS[1]].map((s) => ({ ...s, score: 1 }));
  const data = results([row({ sections: shuffled }), row({ userId: 'u2', sections: SECTIONS.map((s) => ({ ...s, score: 2 })) })]);
  assert.deepEqual(
    resultSections(data).map((s) => s.name),
    ['Aptitude', 'Case Study', 'Common Management'],
  );
  assert.equal(resultsColumns(data).length, 15 + 6);
});

test('a student maps score + max into the right section pair', () => {
  const data = results([
    row({
      sections: [
        { name: 'Aptitude', score: 14, maxMarks: 20, order: 0 },
        { name: 'Case Study', score: 9, maxMarks: 15, order: 20 },
        { name: 'Common Management', score: 7, maxMarks: 10, order: 35 },
      ],
    }),
  ]);
  const [cells] = resultsRows(data);
  assert.deepEqual(cells.slice(15), [14, 20, 9, 15, 7, 10]);
  // The fixed columns come straight off the row - nothing is recomputed here.
  assert.deepEqual(cells.slice(4, 9), [45, 30, 67, 45, 40]);
  assert.deepEqual(cells.slice(9, 15), [2, 3, 1, 1, 2, 6]);
  assert.equal(cells[0], 'Asha Rao');
  assert.equal(cells[1], '9876543210');
});

test('a student who skipped a whole section gets 0 against its maximum, never a blank', () => {
  const data = results([
    row({
      // Backend behaviour: every student carries every section, a skipped one at 0.
      sections: [
        { name: 'Aptitude', score: 20, maxMarks: 20, order: 0 },
        { name: 'Case Study', score: 0, maxMarks: 15, order: 20 },
        { name: 'Common Management', score: 0, maxMarks: 10, order: 35 },
      ],
    }),
  ]);
  const [cells] = resultsRows(data);
  assert.deepEqual(cells.slice(15), [20, 20, 0, 15, 0, 10]);
  const [, values] = csvLines(buildResultsCsv(data));
  assert.deepEqual(values.slice(15), ['20', '20', '0', '15', '0', '10']);
  assert.equal(values.includes(''), false, 'no section cell is blank');
});

test('a section missing from one student’s row still scores 0 out of the paper’s maximum', () => {
  // Defensive: if a row ever arrives short (an older backend), the column is still
  // filled with a 0 and the section's own maximum - never left empty.
  const data = results([
    row({ sections: SECTIONS.map((s) => ({ ...s, score: 5 })) }),
    row({ userId: 'u2', sections: [{ name: 'Aptitude', score: 11, maxMarks: 20, order: 0 }] }),
  ]);
  const [, second] = resultsRows(data);
  assert.deepEqual(second.slice(15), [11, 20, 0, 15, 0, 10]);
});

test('BOM, CRLF and formula-injection escaping survive the new format', () => {
  const data = results([row({ fullName: '=HYPERLINK("http://evil","Asha")', phone: '+919876543210' })]);
  const csv = buildResultsCsv(data);
  assert.equal(csv.startsWith(CSV_BOM), true);
  assert.equal(csv.includes('\r\n'), true);
  // A leading = or + is made inert with a tab, and every cell stays quoted.
  assert.equal(csv.includes('"\t=HYPERLINK(""http://evil"",""Asha"")"'), true);
  assert.equal(csv.includes('"\t+919876543210"'), true);
});

test('a section name with a comma or a quote cannot break the column count', () => {
  const sections = [
    { name: 'Aptitude, Verbal', score: 3, maxMarks: 6, order: 0 },
    { name: 'The "Case" Study', score: 4, maxMarks: 8, order: 10 },
  ];
  const data = results([row({ sections })]);
  const [header, values] = csvLines(buildResultsCsv(data));
  assert.equal(header.length, 15 + 4);
  assert.equal(values.length, 15 + 4);
  assert.deepEqual(header.slice(15), [
    'Section-wise Scores-Aptitude, Verbal',
    'Section-wise Max Scores-Aptitude, Verbal',
    'Section-wise Scores-The "Case" Study',
    'Section-wise Max Scores-The "Case" Study',
  ]);
});

test('no attempts exports nothing rather than a header-only file', () => {
  assert.equal(buildResultsCsv(results([])), '');
});

test('an assessment with no sections is still a valid 15-column export', () => {
  const data = results([row({ sections: [] })]);
  assert.deepEqual(resultsColumns(data), [...FIXED_RESULT_COLUMNS]);
  assert.equal(resultsRows(data)[0].length, 15);
});

/**
 * THE TPO's Placement Readiness Test report - the SAME generator, a different fixed
 * block: Email in (a placement office identifies a student by email outside the
 * console), the six proctoring counts out (the file is circulated as a score sheet).
 *
 * These tests exist because a second copy of the column list would drift from the
 * first silently: a header that no longer matches its own cells is still a valid CSV.
 */

/** The four sections of the owner's "Placement Readiness Test", in the paper's order. */
const PRT_SECTIONS = [
  { name: 'Numerical Ability', maxMarks: 25, order: 0 },
  { name: 'Logical Reasoning', maxMarks: 25, order: 25 },
  { name: 'Verbal Ability', maxMarks: 25, order: 50 },
  { name: 'Technical MCQs', maxMarks: 25, order: 75 },
];

/** The owner's header, verbatim, for that four-section paper. */
const OWNER_HEADER =
  'Name,Email,Phone,Attempted Status,Started At,Submitted At,Maximum Marks,Overall Score,Percentage,' +
  'Total Questions,Attempted Questions,' +
  'Section-wise Scores-Numerical Ability,Section-wise Max Scores-Numerical Ability,' +
  'Section-wise Scores-Logical Reasoning,Section-wise Max Scores-Logical Reasoning,' +
  'Section-wise Scores-Verbal Ability,Section-wise Max Scores-Verbal Ability,' +
  'Section-wise Scores-Technical MCQs,Section-wise Max Scores-Technical MCQs';

test('the test report emits the owner\u2019s header exactly, for that paper\u2019s own sections', () => {
  const data = results([row({ sections: PRT_SECTIONS.map((s) => ({ ...s, score: 0 })) })]);
  assert.equal(resultsColumns(data, TEST_REPORT_COLUMNS).join(','), OWNER_HEADER);
  // And that is the file's first line, cell for cell.
  assert.deepEqual(
    csvLines(buildResultsCsv(data, TEST_REPORT_COLUMNS))[0],
    OWNER_HEADER.split(','),
  );
});

test('the section pairs come from the paper, not from that one four-section test', () => {
  // Same variant, a two-section paper: four section columns, in the paper's order.
  const data = results([
    row({
      sections: [
        { name: 'Aptitude', score: 8, maxMarks: 20, order: 0 },
        { name: 'Coding', score: 5, maxMarks: 30, order: 20 },
      ],
    }),
  ]);
  assert.deepEqual(resultsColumns(data, TEST_REPORT_COLUMNS).slice(11), [
    'Section-wise Scores-Aptitude',
    'Section-wise Max Scores-Aptitude',
    'Section-wise Scores-Coding',
    'Section-wise Max Scores-Coding',
  ]);
});

test('Email is a real column with the student\u2019s address, and proctoring is gone', () => {
  const data = results([row({ sections: PRT_SECTIONS.map((s) => ({ ...s, score: 10 })) })]);
  const columns = resultsColumns(data, TEST_REPORT_COLUMNS);
  const [cells] = resultsRows(data, TEST_REPORT_COLUMNS);
  assert.equal(columns[1], 'Email');
  assert.equal(cells[1], 'asha@example.com');
  // Not one proctoring column survives - by name or by value.
  for (const c of [
    'Tab Switches Count',
    'Face Violations Count',
    'Fullscreen Exits Count',
    'Face Validation Failures Count',
    'Multiple Face Detections Count',
    'Total Violation Count',
  ]) {
    assert.equal(columns.includes(c), false, `${c} must not be in the test report`);
  }
  assert.equal(columns.length, 11 + 8);
  assert.equal(cells.length, 11 + 8);
  // The eleven fixed cells are the row's own values, shifted one right by Email.
  assert.deepEqual(cells.slice(0, 11), [
    'Asha Rao',
    'asha@example.com',
    '9876543210',
    'Yes',
    new Date('2026-09-10T09:00:00.000Z').toLocaleString(),
    new Date('2026-09-10T10:00:00.000Z').toLocaleString(),
    45,
    30,
    67,
    45,
    40,
  ]);
});

test('every student carries a value in every section column - 0 and the section max', () => {
  const data = results([
    row({
      sections: [
        { name: 'Numerical Ability', score: 18, maxMarks: 25, order: 0 },
        { name: 'Logical Reasoning', score: 0, maxMarks: 25, order: 25 },
        { name: 'Verbal Ability', score: 7, maxMarks: 25, order: 50 },
        { name: 'Technical MCQs', score: 0, maxMarks: 25, order: 75 },
      ],
    }),
    // Defensive: a row that arrives short still fills every column.
    row({ userId: 'u2', sections: [{ name: 'Numerical Ability', score: 4, maxMarks: 25, order: 0 }] }),
  ]);
  const [first, second] = resultsRows(data, TEST_REPORT_COLUMNS);
  assert.deepEqual(first.slice(11), [18, 25, 0, 25, 7, 25, 0, 25]);
  assert.deepEqual(second.slice(11), [4, 25, 0, 25, 0, 25, 0, 25]);
  const lines = csvLines(buildResultsCsv(data, TEST_REPORT_COLUMNS));
  for (const values of lines.slice(1)) {
    assert.equal(values.length, 11 + 8);
    assert.equal(values.slice(11).includes(''), false, 'no section cell is blank');
  }
});

/**
 * THE ROSTER ROWS - a student who never sat the test.
 *
 * The whole point of the report is that they appear at all; the whole risk is that
 * their row reads like a sitting that went badly. Identity, then "No", then nothing:
 * a zero would average, sort in among the genuine zeros, and make an absentee look
 * like someone who turned up and scored nothing.
 */
test('a student who never sat it says No and leaves every test cell blank', () => {
  const data = results([
    row({ sections: PRT_SECTIONS.map((s) => ({ ...s, score: 10 })) }),
    row({
      userId: 'u2',
      fullName: 'Never Sat',
      email: 'never@example.com',
      phone: '9000000003',
      attempted: false,
      status: 'NOT_ATTEMPTED',
      score: 0,
      total: 0,
      scorePct: 0,
      rank: 0,
      passed: false,
      startedAt: null,
      submittedAt: null,
      totalQuestions: 0,
      attemptedQuestions: 0,
      sections: [],
    }),
  ]);
  const [sat, absent] = resultsRows(data, TEST_REPORT_COLUMNS);

  // Identity is kept - that IS the row.
  assert.deepEqual(absent.slice(0, 4), ['Never Sat', 'never@example.com', '9000000003', 'No']);
  // Everything after it is blank, section columns included. Not 0, not '-'.
  assert.deepEqual(
    absent.slice(4),
    new Array(absent.length - 4).fill(''),
  );
  // Same width as a real attempt, so the two are one grid.
  assert.equal(absent.length, sat.length);
  assert.equal(sat[3], 'Yes');
});

test('the header still carries every section when NOBODY has sat it yet', () => {
  // A brand-new cohort: rows, but no section data in any of them. The paper's own
  // section list is what keeps the columns - the rows cannot supply them.
  const data = results([
    row({ userId: 'u9', attempted: false, sections: [] }),
  ]);
  data.assessment.sections = PRT_SECTIONS;

  assert.equal(resultsColumns(data, TEST_REPORT_COLUMNS).join(','), OWNER_HEADER);
  const [cells] = resultsRows(data, TEST_REPORT_COLUMNS);
  assert.equal(cells.length, 11 + 8);
});

test('the test report is as formula-injection-safe as the modal one', () => {
  const data = results([
    row({
      fullName: '=cmd|/c calc',
      email: '+admin@evil.test',
      sections: PRT_SECTIONS.map((s) => ({ ...s, score: 1 })),
    }),
  ]);
  const csv = buildResultsCsv(data, TEST_REPORT_COLUMNS);
  assert.equal(csv.startsWith(CSV_BOM), true);
  assert.equal(csv.includes('"\t=cmd|/c calc"'), true);
  assert.equal(csv.includes('"\t+admin@evil.test"'), true);
});

test('resultsCsvBody is the same file WITHOUT the BOM - downloadCsv adds its own', () => {
  // downloadCsv() prepends CSV_BOM, so the card must hand it a body, not a whole file:
  // passing buildResultsCsv() there would write two BOMs and Excel shows a stray glyph.
  const data = results([row({ sections: PRT_SECTIONS.map((s) => ({ ...s, score: 3 })) })]);
  const body = resultsCsvBody(data, TEST_REPORT_COLUMNS);
  assert.equal(body.startsWith(CSV_BOM), false);
  assert.equal(CSV_BOM + body, buildResultsCsv(data, TEST_REPORT_COLUMNS));
  assert.equal(resultsCsvBody(results([]), TEST_REPORT_COLUMNS), '');
});

test('the modal variant is untouched - it is still the default, still 15 fixed columns', () => {
  const data = results([row()]);
  assert.deepEqual(resultsColumns(data), resultsColumns(data, RESULTS_MODAL_COLUMNS));
  assert.deepEqual(resultsRows(data), resultsRows(data, RESULTS_MODAL_COLUMNS));
  assert.equal(FIXED_RESULT_COLUMNS.length, 15);
  assert.equal(FIXED_RESULT_COLUMNS.includes('Email'), false);
  assert.equal(buildResultsCsv(data), buildResultsCsv(data, RESULTS_MODAL_COLUMNS));
});
