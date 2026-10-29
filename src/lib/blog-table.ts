/**
 * GFM pipe-table parsing for the blog renderer.
 *
 * Extracted from BlogContent so it can be tested: this repo has no JSX test runner, but
 * it does run `node --test` over plain .ts, and the parsing rules below are where a table
 * renderer actually goes wrong — ragged rows shifting every later cell into the wrong
 * column, escaped pipes splitting a cell in half, and a line of prose that happens to
 * contain a pipe swallowing the paragraph after it.
 */

export type Align = 'left' | 'center' | 'right';

/** Split one pipe row into cells, tolerating optional leading/trailing pipes. */
export function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  // Keep a trailing `\|` — that is an escaped pipe in the last cell, not a row terminator.
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
  return t
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));
}

/**
 * Is this the `|---|:--:|` row under a table header? Returns the per-column alignment,
 * or null when the line is not a delimiter.
 *
 * Every cell must be dashes with optional colons. Without that strictness a sentence
 * containing a pipe reads as a delimiter and the paragraph after it disappears into a
 * table body.
 */
export function parseDelimiter(line: string | undefined): Align[] | null {
  if (!line || !line.includes('-')) return null;
  const cells = splitRow(line);
  if (!cells.length) return null;
  const aligns: Align[] = [];
  for (const c of cells) {
    if (!/^:?-{1,}:?$/.test(c)) return null;
    aligns.push(
      c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left',
    );
  }
  return aligns;
}

export interface ParsedTable {
  header: string[];
  aligns: Align[];
  rows: string[][];
  /** Index of the last line consumed, so the caller can resume after the table. */
  endIndex: number;
}

/**
 * Parse a table starting at `start`, or null when there isn't one there.
 *
 * A table is a header row plus a delimiter row with the SAME number of cells. Body rows
 * are padded or trimmed to the header width, because a ragged row would otherwise shift
 * every cell after it one column left and quietly corrupt the data the post is about.
 */
export function parseTable(lines: string[], start: number): ParsedTable | null {
  const head = (lines[start] ?? '').replace(/\s+$/, '');
  if (!head.includes('|')) return null;
  const aligns = parseDelimiter((lines[start + 1] ?? '').replace(/\s+$/, ''));
  if (!aligns) return null;
  const header = splitRow(head);
  if (aligns.length !== header.length) return null;
  if (!header.some((h) => h !== '')) return null;

  const rows: string[][] = [];
  let j = start + 2;
  for (; j < lines.length; j++) {
    const r = (lines[j] ?? '').replace(/\s+$/, '');
    if (r.trim() === '' || !r.includes('|')) break;
    const cells = splitRow(r);
    while (cells.length < header.length) cells.push('');
    rows.push(cells.slice(0, header.length));
  }
  return { header, aligns, rows, endIndex: j - 1 };
}
