/**
 * Parse the CREATE TABLE + INSERT seed of a SQL coding problem into structured
 * tables, so the workspace can render the schema + sample rows as real tables
 * instead of raw SQL text. Tuned for the SQLite-style seeds used by our problem
 * bank (simple column defs, VALUES lists), and fails soft: anything it can't parse
 * is returned as `null` so the caller falls back to the plain-text sample.
 */

export interface SqlColumn {
  name: string;
  type: string;
  /** From the statement's "- `col` (TYPE): description" bullets, when present. */
  description?: string;
}

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
  rows: string[][];
}

const CONSTRAINT_HEADS = new Set([
  'primary',
  'foreign',
  'unique',
  'check',
  'constraint',
  'key',
]);

/** Split on commas that sit at parenthesis-depth 0 (so `VARCHAR(10,2)` stays whole). */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (ch === '(') {
      depth++;
      cur += ch;
    } else if (ch === ')') {
      depth--;
      cur += ch;
    } else if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/** Column name + type from a CREATE TABLE column definition line. */
function parseColumnDef(def: string): SqlColumn | null {
  const trimmed = def.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  const first = trimmed.split(' ')[0].replace(/["'`]/g, '').toLowerCase();
  if (CONSTRAINT_HEADS.has(first)) return null; // table-level constraint, not a column
  const m = trimmed.match(/^["'`]?([A-Za-z_][\w]*)["'`]?\s+([A-Za-z]+(?:\s*\([^)]*\))?)/);
  if (!m) return null;
  return { name: m[1], type: m[2].toUpperCase().replace(/\s+/g, '') };
}

/** Split a VALUES blob `(a,'b'),(c,'d')` into rows of raw value tokens. */
function parseValueRows(blob: string): string[][] {
  const rows: string[][] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (let i = 0; i < blob.length; i++) {
    const ch = blob[i];
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
    } else if (ch === '(') {
      if (depth === 0) cur = '';
      else cur += ch;
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        rows.push(splitTopLevel(cur).map(cleanValue));
        cur = '';
      } else cur += ch;
    } else if (depth > 0) {
      cur += ch;
    }
  }
  return rows;
}

/** Unwrap a SQL literal for display: strip surrounding quotes, unescape ''→'. */
function cleanValue(v: string): string {
  const t = v.trim();
  if (/^'.*'$/s.test(t)) return t.slice(1, -1).replace(/''/g, "'");
  if (/^".*"$/s.test(t)) return t.slice(1, -1);
  if (/^null$/i.test(t)) return 'NULL';
  return t;
}

/** Map column → description from statement bullets like "- `emp_id` (INTEGER): unique id". */
function descriptionsFromStatement(statement: string): Record<string, string> {
  const map: Record<string, string> = {};
  const re = /[-*]\s*`?([A-Za-z_][\w]*)`?\s*\([^)]*\)\s*[:\-–]\s*(.+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(statement)) !== null) {
    map[m[1].toLowerCase()] = m[2].trim();
  }
  return map;
}

/**
 * Parse the seed into tables with columns (name/type/description) + sample rows.
 * Returns null when there's no CREATE TABLE (not a SQL-schema problem) or on any
 * failure, so the caller keeps the plain-text fallback.
 */
export function parseSqlSchema(sampleInput: string | undefined, statement = ''): SqlTable[] | null {
  if (!sampleInput || !/create\s+table/i.test(sampleInput)) return null;
  try {
    const descriptions = descriptionsFromStatement(statement);
    const tables = new Map<string, SqlTable>();
    const order: string[] = [];

    // CREATE TABLE <name> ( <defs> );
    const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?["'`]?([A-Za-z_][\w]*)["'`]?\s*\(([\s\S]*?)\)\s*;/gi;
    let cm: RegExpExecArray | null;
    while ((cm = createRe.exec(sampleInput)) !== null) {
      const name = cm[1];
      const columns = splitTopLevel(cm[2])
        .map(parseColumnDef)
        .filter((c): c is SqlColumn => c !== null)
        .map((col) => ({ ...col, description: descriptions[col.name.toLowerCase()] }));
      if (!tables.has(name)) order.push(name);
      tables.set(name, { name, columns, rows: [] });
    }
    if (tables.size === 0) return null;

    // INSERT INTO <name> [(cols)] VALUES <rows>;
    const insertRe = /insert\s+into\s+["'`]?([A-Za-z_][\w]*)["'`]?\s*(\([^)]*\))?\s*values\s*([\s\S]*?);/gi;
    let im: RegExpExecArray | null;
    while ((im = insertRe.exec(sampleInput)) !== null) {
      const t = tables.get(im[1]);
      if (!t) continue;
      t.rows.push(...parseValueRows(im[3]));
    }

    return order.map((n) => tables.get(n)!);
  } catch {
    return null;
  }
}
