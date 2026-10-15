/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * IMPORTING ACADEMIC MARKS (PRD §20, and the data §4/§6/§8 have been waiting for).
 *
 * §20's twelfth acceptance criterion asks to "evaluate against academic hard rules and
 * show clear pass/fail reasons". The engine has always done that correctly and always
 * answered UNKNOWN, because the platform held no marks at all.
 *
 * WHY AN IMPORT AND NOT A PROFILE FORM. Asking students directly does not work here, and
 * that is measured rather than assumed: a dashboard banner has asked students for a phone
 * number and a department for months, and 50% still have no phone and 61% no department.
 * Marks decide who may apply for a job, so a 40%-complete field is not a minor gap — it
 * is a cohort that cannot be judged. A TPO holds the mark sheets already.
 *
 * THREE RULES THIS FILE EXISTS TO ENFORCE:
 *
 *   1. A BLANK CELL CLEARS NOTHING. An import is nearly always partial — a TPO has 10th
 *      and 12th marks today and graduation marks in June. Treating blank as "set to null"
 *      would make every partial import destroy the marks loaded before it, and the person
 *      doing it would have no way to know.
 *
 *   2. A CGPA IS NOT A PERCENTAGE. A column holding 8.2 and 82 and meaning different
 *      things by row is unusable in a comparison, and a ">= 60" rule silently passes
 *      every CGPA row. Values are declared per column and converted on entry.
 *
 *   3. EVERY REJECTED ROW IS NAMED AND NUMBERED. "412 of 455 imported" tells a TPO that
 *      43 students are missing without saying which, so nobody fixes them — and those 43
 *      are then invisible to every drive that uses an academic rule.
 */

/** Columns an import may carry. The header may use any of the accepted spellings. */
export enum AcademicColumn {
  EMAIL = 'EMAIL',
  ROLL_NUMBER = 'ROLL_NUMBER',
  SCORE_10TH = 'SCORE_10TH',
  SCORE_12TH = 'SCORE_12TH',
  SCORE_DIPLOMA = 'SCORE_DIPLOMA',
  SCORE_GRADUATION = 'SCORE_GRADUATION',
  SCORE_POSTGRADUATION = 'SCORE_POSTGRADUATION',
  ACTIVE_BACKLOGS = 'ACTIVE_BACKLOGS',
  TOTAL_BACKLOGS = 'TOTAL_BACKLOGS',
  EDUCATION_GAP_YEARS = 'EDUCATION_GAP_YEARS',
  DEGREE = 'DEGREE',
}

/**
 * Header spellings accepted for each column.
 *
 * Generous on purpose. A TPO exports from a university portal whose headers nobody
 * controls, and refusing "10th %" because the template said "score_10th" turns a
 * thirty-second job into a morning of renaming columns — after which somebody gives up
 * and the marks never arrive.
 */
export const ACADEMIC_HEADERS: Readonly<Record<AcademicColumn, readonly string[]>> = {
  [AcademicColumn.EMAIL]: ['email', 'email id', 'e-mail', 'student email', 'mail'],
  [AcademicColumn.ROLL_NUMBER]: ['roll', 'roll no', 'roll number', 'rollno', 'registration number'],
  [AcademicColumn.SCORE_10TH]: ['10th', '10th %', 'score 10th', 'score_10th', 'class 10', 'x %', 'ssc', 'tenth'],
  [AcademicColumn.SCORE_12TH]: ['12th', '12th %', 'score 12th', 'score_12th', 'class 12', 'xii %', 'hsc', 'twelfth', 'intermediate'],
  [AcademicColumn.SCORE_DIPLOMA]: ['diploma', 'diploma %', 'score diploma', 'score_diploma'],
  // NOTE: no 'degree %' here. Normalising strips '%', so it would collide with the
  // DEGREE column and silently swallow it — which rejected every row of a real file
  // before this was caught. Ambiguous spellings are worse than missing ones: an
  // unrecognised header is reported, a mis-recognised one corrupts the import.
  [AcademicColumn.SCORE_GRADUATION]: ['graduation', 'graduation %', 'ug', 'ug %', 'cgpa', 'score graduation', 'score_graduation', 'btech %', 'aggregate'],
  [AcademicColumn.SCORE_POSTGRADUATION]: ['pg', 'pg %', 'post graduation', 'postgraduation', 'score_postgraduation', 'masters %'],
  [AcademicColumn.ACTIVE_BACKLOGS]: ['active backlogs', 'current backlogs', 'live backlogs', 'active_backlogs', 'standing arrears'],
  [AcademicColumn.TOTAL_BACKLOGS]: ['total backlogs', 'backlogs', 'history of arrears', 'total_backlogs', 'arrears'],
  [AcademicColumn.EDUCATION_GAP_YEARS]: ['gap', 'education gap', 'gap years', 'education_gap_years', 'year gap'],
  [AcademicColumn.DEGREE]: ['degree', 'course', 'programme', 'program', 'qualification'],
};

/** Columns holding a 0–100 percentage after conversion. */
export const PERCENTAGE_COLUMNS: readonly AcademicColumn[] = [
  AcademicColumn.SCORE_10TH,
  AcademicColumn.SCORE_12TH,
  AcademicColumn.SCORE_DIPLOMA,
  AcademicColumn.SCORE_GRADUATION,
  AcademicColumn.SCORE_POSTGRADUATION,
] as const;

/** Columns holding a whole count. */
export const COUNT_COLUMNS: readonly AcademicColumn[] = [
  AcademicColumn.ACTIVE_BACKLOGS,
  AcademicColumn.TOTAL_BACKLOGS,
  AcademicColumn.EDUCATION_GAP_YEARS,
] as const;

/** How a column's numbers are written in THIS file. Declared, never guessed per row. */
export enum ScoreScale {
  PERCENTAGE = 'PERCENTAGE',
  /** 0–10 CGPA. Multiplied by the stated multiplier to reach a percentage. */
  CGPA_10 = 'CGPA_10',
  /** 0–4 GPA, as some private universities use. */
  GPA_4 = 'GPA_4',
}

export const SCALE_LABELS: Readonly<Record<ScoreScale, string>> = {
  [ScoreScale.PERCENTAGE]: 'Percentage (0–100)',
  [ScoreScale.CGPA_10]: 'CGPA out of 10',
  [ScoreScale.GPA_4]: 'GPA out of 4',
};

/**
 * Convert a declared scale to the stored percentage.
 *
 * The CGPA multiplier is a per-university constant and is therefore ASKED FOR rather than
 * assumed. 9.5 is the most common Indian convention and is offered as the default, but a
 * university using 10 would have every student's graduation mark understated by 5% if the
 * software quietly picked for them — enough to fail an eligibility bar.
 */
export function toPercentage(
  value: number,
  scale: ScoreScale,
  cgpaMultiplier = 9.5,
): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const pct =
    scale === ScoreScale.PERCENTAGE
      ? value
      : scale === ScoreScale.CGPA_10
        ? value * cgpaMultiplier
        : (value / 4) * 100;
  if (pct < 0 || pct > 100) return null;
  return Math.round(pct * 100) / 100;
}

/** Normalises a header cell for matching: case, spacing and punctuation are noise. */
export function normaliseHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[._]+/g, ' ').replace(/\s+/g, ' ').replace(/[()%]/g, '').trim();
}

/** Which column a header names, or null when nothing recognises it. */
export function columnFor(header: string): AcademicColumn | null {
  const n = normaliseHeader(header);
  for (const [col, spellings] of Object.entries(ACADEMIC_HEADERS)) {
    if (spellings.some((s) => normaliseHeader(s) === n)) return col as AcademicColumn;
  }
  return null;
}

export interface AcademicRowProblem {
  /** 1-based, counting the header as row 1 — what the TPO's spreadsheet shows. */
  row: number;
  /** Whatever identified the student on that row, so it can be found again. */
  identifier: string;
  message: string;
}

export interface ParsedAcademicRow {
  row: number;
  email: string | null;
  rollNumber: string | null;
  values: Partial<Record<AcademicColumn, number | string>>;
}

export interface ParsedAcademicFile {
  /** Columns recognised in the header, in file order. */
  recognised: AcademicColumn[];
  /** Header cells nothing matched. Reported, never silently dropped. */
  unrecognised: string[];
  rows: ParsedAcademicRow[];
  problems: AcademicRowProblem[];
}

/**
 * Parse a CSV into rows ready to apply.
 *
 * Rejects rather than guesses: a row with no email and no roll number cannot be matched
 * to a student, and a value that is not a number in a numeric column is an error worth
 * showing rather than a zero worth storing.
 *
 * A BLANK CELL IS OMITTED FROM `values`, NOT SET TO NULL — see rule 1 in the header. That
 * is the difference between "I did not have this today" and "set this student's 12th mark
 * to nothing", and an import is nearly always the former.
 */
export function parseAcademicCsv(
  text: string,
  opts: { scales?: Partial<Record<AcademicColumn, ScoreScale>>; cgpaMultiplier?: number } = {},
): ParsedAcademicFile {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const problems: AcademicRowProblem[] = [];
  if (lines.length === 0) {
    return { recognised: [], unrecognised: [], rows: [], problems: [{ row: 1, identifier: '', message: 'The file is empty.' }] };
  }

  const headerCells = splitCsvLine(lines[0]);
  const mapping = headerCells.map(columnFor);
  const recognised = mapping.filter((m): m is AcademicColumn => m !== null);
  const unrecognised = headerCells.filter((_, i) => mapping[i] === null && headerCells[i].trim() !== '');

  if (!recognised.includes(AcademicColumn.EMAIL) && !recognised.includes(AcademicColumn.ROLL_NUMBER)) {
    problems.push({
      row: 1,
      identifier: '',
      message: 'No email or roll-number column found, so no row can be matched to a student.',
    });
    return { recognised, unrecognised, rows: [], problems };
  }

  const rows: ParsedAcademicRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const rowNo = i + 1;
    const values: Partial<Record<AcademicColumn, number | string>> = {};
    let email: string | null = null;
    let roll: string | null = null;
    let rowProblem: string | null = null;

    for (let c = 0; c < mapping.length; c++) {
      const col = mapping[c];
      if (!col) continue;
      const raw = (cells[c] ?? '').trim();
      // Blank means "not supplied in this file", never "clear it".
      if (raw === '') continue;

      if (col === AcademicColumn.EMAIL) { email = raw.toLowerCase(); continue; }
      if (col === AcademicColumn.ROLL_NUMBER) { roll = raw; continue; }
      if (col === AcademicColumn.DEGREE) { values[col] = raw; continue; }

      const n = Number(raw.replace(/%/g, '').trim());
      if (!Number.isFinite(n)) {
        rowProblem = `"${raw}" is not a number in the ${col.replace(/_/g, ' ').toLowerCase()} column.`;
        break;
      }
      if (COUNT_COLUMNS.includes(col)) {
        if (n < 0 || !Number.isInteger(n)) {
          rowProblem = `${col.replace(/_/g, ' ').toLowerCase()} must be a whole number of zero or more, not "${raw}".`;
          break;
        }
        values[col] = n;
        continue;
      }
      const scale = opts.scales?.[col] ?? ScoreScale.PERCENTAGE;
      const pct = toPercentage(n, scale, opts.cgpaMultiplier);
      if (pct === null) {
        rowProblem =
          scale === ScoreScale.PERCENTAGE
            ? `"${raw}" is not a percentage between 0 and 100. If this column holds CGPA, say so above and it will be converted.`
            : `"${raw}" does not convert to a percentage between 0 and 100 on the ${SCALE_LABELS[scale]} scale.`;
        break;
      }
      values[col] = pct;
    }

    const identifier = email ?? roll ?? `row ${rowNo}`;
    if (rowProblem) { problems.push({ row: rowNo, identifier, message: rowProblem }); continue; }
    if (!email && !roll) {
      problems.push({ row: rowNo, identifier, message: 'No email or roll number, so this row cannot be matched to a student.' });
      continue;
    }
    if (Object.keys(values).length === 0) {
      problems.push({ row: rowNo, identifier, message: 'Every mark on this row is blank, so there is nothing to import.' });
      continue;
    }
    // Caught here as well as by the database, so the TPO sees the row number.
    const active = values[AcademicColumn.ACTIVE_BACKLOGS];
    const total = values[AcademicColumn.TOTAL_BACKLOGS];
    if (typeof active === 'number' && typeof total === 'number' && active > total) {
      problems.push({ row: rowNo, identifier, message: `Active backlogs (${active}) cannot exceed total backlogs (${total}) — the columns may be the wrong way round.` });
      continue;
    }
    rows.push({ row: rowNo, email, rollNumber: roll, values });
  }

  return { recognised, unrecognised, rows, problems };
}

/** Minimal CSV splitter: handles quoted cells and escaped quotes, which is what exports produce. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export interface AcademicImportResult {
  /** Students whose marks were written. */
  updated: number;
  /** Rows that parsed but matched no student — named, never counted. */
  unmatched: AcademicRowProblem[];
  /** Rows rejected at parse time. */
  problems: AcademicRowProblem[];
  recognised: AcademicColumn[];
  unrecognised: string[];
  /** How many students in scope now have a graduation mark — the number §20 turns on. */
  coverage: { withGraduation: number; withTenth: number; withTwelfth: number; total: number };
}
