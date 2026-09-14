/**
 * Tests for the user sheet export flow: the audit row records exactly the file the admin
 * got. Zero-dependency: Node's built-in test runner with native type stripping
 * (Node >= 22.18):
 *
 *   node --test src/components/superadmin/user-sheet/sheet-export.test.mjs
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

const { EXPORT_FILTER_MAX_LENGTH, exportAuditFilters, runUserSheetExport } = await import('./sheet-export.ts');
const { EMPTY_FILTERS, NO_COLLEGE, hasActiveFilters } = await import('./sheet-model.ts');
const { saveUserSheet } = await import('./sheet-file.ts');
const { ApiRequestError } = await import('@/lib/api/types');

const SERVER_TIME = '2026-09-15T06:34:05.123Z';

function row(overrides) {
  return {
    id: 'u1',
    fullName: 'Asha Rao',
    email: 'asha@example.com',
    phone: '9876543210',
    role: 'STUDENT',
    status: 'ACTIVE',
    isEmailVerified: true,
    collegeName: 'Alpha College',
    cohortName: null,
    department: 'CSE',
    createdAt: '2026-09-10T10:00:00.000Z',
    lastLoginAt: null,
    updatedAt: '2026-09-10T10:00:00.000Z',
    paidStatus: 'UNPAID',
    accessLabel: null,
    paidUntil: null,
    ...overrides,
  };
}

const ROWS = [
  row({ id: 'u1' }),
  row({ id: 'u2', fullName: 'Ravi Kumar', email: 'ravi@example.com', collegeName: null, paidStatus: 'PAID' }),
  row({ id: 'u3', fullName: 'Meera Admin', email: 'meera@example.com', role: 'ADMIN', paidStatus: null }),
];

function filters(overrides = {}) {
  return { ...EMPTY_FILTERS, ...overrides };
}

/** Fake I/O that logs every call in order. */
function fakeIo({ rows = ROWS, save, record } = {}) {
  const calls = [];
  return {
    calls,
    io: {
      fetchSnapshot: async () => {
        calls.push(['fetch']);
        return { mode: 'full', rows, removedIds: [], serverTime: SERVER_TIME, cursor: SERVER_TIME };
      },
      saveFile: async (saved, format, meta) => {
        calls.push(['save', saved, format, meta]);
        return save ? save(saved) : saved.length;
      },
      record: async (entry) => {
        calls.push(['record', entry]);
        if (record) return record(entry);
        return { recorded: true };
      },
    },
  };
}

// --- exportAuditFilters ----------------------------------------------------------

test('audit filters: nothing set records nothing', () => {
  assert.deepEqual(exportAuditFilters(filters()), {});
  assert.deepEqual(exportAuditFilters(filters({ search: '   \t ' })), {});
});

test('audit filters: only the set keys, the search trimmed as it is applied', () => {
  assert.deepEqual(exportAuditFilters(filters({ search: '  asha rao ', role: 'STUDENT' })), {
    search: 'asha rao',
    role: 'STUDENT',
  });
  assert.deepEqual(
    exportAuditFilters(filters({ status: 'SUSPENDED', paid: 'COLLEGE_ACCESS', college: NO_COLLEGE })),
    { status: 'SUSPENDED', paid: 'COLLEGE_ACCESS', college: NO_COLLEGE },
  );
});

test('audit filters: values are cut to the server limits by code point', () => {
  const long = 'a'.repeat(250);
  const out = exportAuditFilters(filters({ search: long, college: 'C'.repeat(201), role: 'R'.repeat(41) }));
  assert.equal(out.search, 'a'.repeat(EXPORT_FILTER_MAX_LENGTH.search));
  assert.equal(out.college, 'C'.repeat(200));
  assert.equal(out.role, 'R'.repeat(40));
  // An astral character counts once and is never split in half.
  const emoji = '😀'.repeat(201);
  const clipped = exportAuditFilters(filters({ search: emoji })).search;
  assert.equal(Array.from(clipped).length, 200);
  assert.equal(clipped, '😀'.repeat(200));
  // At the limit nothing changes.
  assert.equal(exportAuditFilters(filters({ paid: 'P'.repeat(20) })).paid, 'P'.repeat(20));
});

test('audit filters: non-empty exactly when a filter is active', () => {
  const cases = [
    filters(),
    filters({ search: ' ' }),
    filters({ search: 'x' }),
    filters({ role: 'STUDENT' }),
    filters({ status: 'ACTIVE' }),
    filters({ paid: 'NA' }),
    filters({ college: NO_COLLEGE }),
    filters({ search: ' y ', role: 'ADMIN', status: 'INVITED', paid: 'PAID', college: 'Alpha College' }),
  ];
  for (const f of cases) {
    assert.equal(Object.keys(exportAuditFilters(f)).length > 0, hasActiveFilters(f), JSON.stringify(f));
  }
});

// --- runUserSheetExport ----------------------------------------------------------

test('export: records the exact filtered row count after the file is saved', async () => {
  const { io, calls } = fakeIo();
  const outcome = await runUserSheetExport('csv', filters({ role: 'STUDENT' }), io);

  assert.deepEqual(outcome, { status: 'saved', rowCount: 2, logged: 'yes' });
  assert.deepEqual(
    calls.map((c) => c[0]),
    ['fetch', 'save', 'record'],
  );
  const [, saved, format, meta] = calls[1];
  assert.deepEqual(
    saved.map((r) => r.id),
    ['u1', 'u2'],
  );
  assert.equal(format, 'csv');
  assert.deepEqual(meta, { serverTime: SERVER_TIME, filtered: true });
  assert.deepEqual(calls[2][1], {
    format: 'csv',
    rowCount: 2,
    filtered: true,
    filters: { role: 'STUDENT' },
    snapshotServerTime: SERVER_TIME,
  });
});

test('export: an unfiltered Excel export records every row and no filters', async () => {
  const { io, calls } = fakeIo();
  const outcome = await runUserSheetExport('xlsx', filters({ search: '  ' }), io);

  assert.deepEqual(outcome, { status: 'saved', rowCount: 3, logged: 'yes' });
  assert.deepEqual(calls[1][3], { serverTime: SERVER_TIME, filtered: false });
  const entry = calls[2][1];
  assert.deepEqual(entry, { format: 'xlsx', rowCount: 3, filtered: false, snapshotServerTime: SERVER_TIME });
  assert.equal('filters' in entry, false);
});

test('export: the recorded count is what the file writer reports, not the snapshot size', async () => {
  // A sentinel distinct from both the snapshot (3) and the matching rows (1): the writer
  // is the authority on how many data rows the file holds.
  const { io, calls } = fakeIo({ save: () => 7 });
  const outcome = await runUserSheetExport('csv', filters({ search: 'asha' }), io);
  assert.equal(calls[1][1].length, 1);
  assert.equal(outcome.rowCount, 7);
  assert.equal(calls[2][1].rowCount, 7);
  assert.deepEqual(calls[2][1].filters, { search: 'asha' });
});

test('export: the search is applied and recorded as typed, trimmed', async () => {
  const { io, calls } = fakeIo();
  const outcome = await runUserSheetExport('csv', filters({ search: '  RAVI  ', college: NO_COLLEGE }), io);
  assert.deepEqual(outcome, { status: 'saved', rowCount: 1, logged: 'yes' });
  assert.deepEqual(
    calls[1][1].map((r) => r.id),
    ['u2'],
  );
  assert.deepEqual(calls[2][1].filters, { search: 'RAVI', college: NO_COLLEGE });
});

test('export: nothing matches = no file and no audit row', async () => {
  const { io, calls } = fakeIo();
  const outcome = await runUserSheetExport('csv', filters({ search: 'nobody-matches-this' }), io);
  assert.deepEqual(outcome, { status: 'empty', filtered: true });
  assert.deepEqual(
    calls.map((c) => c[0]),
    ['fetch'],
  );
});

test('export: an empty sheet with no filters is empty and unfiltered', async () => {
  const { io, calls } = fakeIo({ rows: [] });
  assert.deepEqual(await runUserSheetExport('xlsx', filters(), io), { status: 'empty', filtered: false });
  assert.equal(calls.length, 1);
});

test('export: a search containing NUL matches nobody, so it is never recorded', async () => {
  const { io, calls } = fakeIo();
  assert.deepEqual(await runUserSheetExport('csv', filters({ search: 'asha\0' }), io), {
    status: 'empty',
    filtered: true,
  });
  assert.equal(calls.length, 1);
});

test('export: a file that fails to generate is not recorded', async () => {
  const boom = new Error('Excel writer failed to load');
  const { io, calls } = fakeIo({
    save: () => {
      throw boom;
    },
  });
  await assert.rejects(runUserSheetExport('xlsx', filters(), io), boom);
  assert.deepEqual(
    calls.map((c) => c[0]),
    ['fetch', 'save'],
  );
});

test('export: a failed snapshot saves and records nothing', async () => {
  const err = new ApiRequestError(429, { code: 'RATE_LIMITED', message: 'Too many requests' });
  const { io, calls } = fakeIo();
  io.fetchSnapshot = async () => {
    calls.push(['fetch']);
    throw err;
  };
  await assert.rejects(runUserSheetExport('csv', filters(), io), err);
  assert.deepEqual(
    calls.map((c) => c[0]),
    ['fetch'],
  );
});

test('export: a 404 from the record call (older backend) is silent', async () => {
  const { io } = fakeIo({
    record: () => {
      throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'Cannot POST /api/v1/admin/user-sheet/exports' });
    },
  });
  assert.deepEqual(await runUserSheetExport('csv', filters(), io), {
    status: 'saved',
    rowCount: 3,
    logged: 'unsupported',
  });
});

test('export: any other record failure keeps the file and reports it as not logged', async () => {
  const failures = [
    new ApiRequestError(500, { code: 'INTERNAL_ERROR', message: 'boom' }),
    new ApiRequestError(400, { code: 'VALIDATION_FAILED', message: 'Request validation failed' }),
    new ApiRequestError(429, { code: 'RATE_LIMITED', message: 'Too many requests' }),
    new ApiRequestError(403, { code: 'FORBIDDEN', message: 'Forbidden' }),
    new TypeError('Failed to fetch'),
  ];
  for (const failure of failures) {
    const { io, calls } = fakeIo({
      record: () => {
        throw failure;
      },
    });
    assert.deepEqual(
      await runUserSheetExport('xlsx', filters({ paid: 'PAID' }), io),
      { status: 'saved', rowCount: 1, logged: 'failed' },
      String(failure),
    );
    assert.equal(calls.filter((c) => c[0] === 'record').length, 1);
  }
});

// --- saveUserSheet (CSV) -----------------------------------------------------------

test('saveUserSheet: the CSV holds a header plus exactly the returned number of rows', async () => {
  const saved = [];
  const created = [];
  const originalDocument = globalThis.document;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  globalThis.document = {
    createElement: () => {
      const a = { click: () => saved.push(a), remove: () => {} };
      return a;
    },
    body: { appendChild: () => {} },
  };
  URL.createObjectURL = (blob) => {
    created.push(blob);
    return 'blob:test';
  };
  URL.revokeObjectURL = () => {};
  try {
    const rows = [ROWS[0], row({ id: 'u9', fullName: 'Line\nBreak', email: 'lb@example.com' })];
    const count = await saveUserSheet(rows, 'csv', { serverTime: SERVER_TIME, filtered: true });
    assert.equal(count, 2);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].download, 'user-sheet-filtered-2026-09-15-1204-IST.csv');

    const text = await created[0].text();
    // Records are CRLF-separated; a newline inside a quoted cell is a bare LF.
    const records = text.replace(/^\uFEFF/, '').split('\r\n');
    assert.equal(records.length, 1 + count);
    assert.match(records[0], /^"Name","Email",/);
    assert.match(records[1], /"asha@example\.com"/);
    assert.match(records[2], /"lb@example\.com"/);
  } finally {
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});
