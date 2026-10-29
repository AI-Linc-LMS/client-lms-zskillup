/**
 * Tests for GFM table parsing in blog bodies.
 *
 *   node --test src/lib/blog-table.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDelimiter, parseTable, splitRow } from './blog-table.ts';

test('splitRow handles pipes with and without outer delimiters', () => {
  assert.deepEqual(splitRow('| A | B |'), ['A', 'B']);
  assert.deepEqual(splitRow('A | B'), ['A', 'B']);
  assert.deepEqual(splitRow('|A|B|C|'), ['A', 'B', 'C']);
  assert.deepEqual(splitRow('|  padded  |  cells |'), ['padded', 'cells']);
});

test('splitRow keeps an escaped pipe inside a cell', () => {
  // A cell reading "a \| b" is ONE cell containing a pipe, not two cells.
  assert.deepEqual(splitRow('| a \\| b | c |'), ['a | b', 'c']);
  assert.deepEqual(splitRow('| trailing \\| |'), ['trailing |']);
});

test('parseDelimiter reads alignment', () => {
  assert.deepEqual(parseDelimiter('|---|---|'), ['left', 'left']);
  assert.deepEqual(parseDelimiter('| :--- | :---: | ---: |'), ['left', 'center', 'right']);
  assert.deepEqual(parseDelimiter('--- | ---'), ['left', 'left']);
  assert.deepEqual(parseDelimiter('|-|-|'), ['left', 'left']);
});

test('parseDelimiter refuses anything that is not a delimiter row', () => {
  // This is the false-positive guard: prose containing a pipe must not be read as a
  // delimiter, or the paragraph after it is swallowed into a table.
  assert.equal(parseDelimiter('Round 1 | aptitude and reasoning'), null);
  assert.equal(parseDelimiter('| not | a | delimiter |'), null);
  assert.equal(parseDelimiter('| --- | oops |'), null);
  assert.equal(parseDelimiter(''), null);
  assert.equal(parseDelimiter(undefined), null);
});

test('parseTable reads a normal table', () => {
  const t = parseTable(['| Round | Topics | Qs |', '|---|---|---:|', '| 1 | Aptitude | 25 |', '| 2 | Coding | 2 |'], 0);
  assert.deepEqual(t.header, ['Round', 'Topics', 'Qs']);
  assert.deepEqual(t.aligns, ['left', 'left', 'right']);
  assert.deepEqual(t.rows, [['1', 'Aptitude', '25'], ['2', 'Coding', '2']]);
  assert.equal(t.endIndex, 3);
});

test('parseTable pads a short row and trims a long one', () => {
  // A ragged row must not shift every later cell one column left.
  const t = parseTable(['| A | B | C |', '|---|---|---|', '| 1 | 2 |', '| 1 | 2 | 3 | 4 |'], 0);
  assert.deepEqual(t.rows, [['1', '2', ''], ['1', '2', '3']]);
});

test('parseTable stops at a blank line and reports where it ended', () => {
  const lines = ['| A |', '|---|', '| 1 |', '', 'After the table.'];
  const t = parseTable(lines, 0);
  assert.deepEqual(t.rows, [['1']]);
  assert.equal(t.endIndex, 2);
  // The caller resumes at endIndex+1, which must still be the blank line.
  assert.equal(lines[t.endIndex + 1], '');
});

test('parseTable returns null when there is no table', () => {
  assert.equal(parseTable(['Just a paragraph.', 'And another.'], 0), null);
  assert.equal(parseTable(['| header |', 'not a delimiter'], 0), null);
  // Header/delimiter cell counts must match, or it is not a table.
  assert.equal(parseTable(['| A | B |', '|---|'], 0), null);
  assert.equal(parseTable(['|  |  |', '|---|---|'], 0), null);
});

test('parseTable works from a non-zero offset', () => {
  const t = parseTable(['Intro.', '', '| A | B |', '|---|---|', '| 1 | 2 |'], 2);
  assert.deepEqual(t.header, ['A', 'B']);
  assert.equal(t.endIndex, 4);
});
