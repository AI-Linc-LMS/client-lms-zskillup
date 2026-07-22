import { Fragment, type ReactNode } from 'react';

/**
 * Lightweight inline math renderer for question stems and options. The question
 * bank stores math as PLAIN TEXT, not LaTeX - powers as `a^b` (e.g. "7^204",
 * "x^5", "32^(31^301)"), subscripts as `a_b` (e.g. "log_4"), and roots as
 * `sqrt(...)`. This turns those into real superscripts / subscripts / a radical
 * so "log_4 sqrt(a + b + c)" reads as log₄ √(a + b + c) instead of raw text.
 *
 * Deliberately NOT a full LaTeX/KaTeX engine (the content isn't LaTeX and that
 * would be a new dependency): it only handles the three notations the bank uses,
 * conservatively, and leaves everything else - including ratios like "2:7" and
 * ordinary prose - untouched. Callers must NOT run this over code/pseudocode,
 * where `^` is bitwise-XOR (QuestionStem already splits those out).
 */

/** Read a balanced `(...)` group starting at `open` (index of '('). */
function readGroup(text: string, open: number): { inner: string; end: number } {
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === '(') depth++;
    else if (text[j] === ')') {
      depth--;
      if (depth === 0) return { inner: text.slice(open + 1, j), end: j + 1 };
    }
  }
  return { inner: text.slice(open + 1), end: text.length };
}

/** Read a bare script token after `^`/`_` - either a `(group)` or a run of
 *  alphanumerics (so `7^204` and `x^5` work, but `a ^ b` with spaces does not). */
function readScript(text: string, start: number): { token: string; end: number } | null {
  if (text[start] === '(') {
    const { inner, end } = readGroup(text, start);
    return { token: inner, end };
  }
  const m = /^[0-9A-Za-z]+/.exec(text.slice(start));
  if (m) return { token: m[0], end: start + m[0].length };
  return null;
}

/** Parse plain-text math into React nodes. Recurses into scripts and radicands. */
function parse(text: string, keyPrefix = ''): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = '';
  let i = 0;
  let k = 0;
  const flush = () => {
    if (buf) {
      out.push(<Fragment key={`${keyPrefix}t${k++}`}>{buf}</Fragment>);
      buf = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // sqrt(...) → radical with an overline over the radicand
    if (
      (ch === 's' || ch === 'S') &&
      /^sqrt\s*\(/i.test(text.slice(i)) &&
      // word boundary before "sqrt" so we don't match inside another word
      (i === 0 || !/[0-9A-Za-z]/.test(text[i - 1]))
    ) {
      const open = text.indexOf('(', i);
      const { inner, end } = readGroup(text, open);
      flush();
      out.push(
        <Fragment key={`${keyPrefix}r${k++}`}>
          <span aria-hidden>√</span>
          <span className="border-t border-current">{parse(inner, `${keyPrefix}r${k}_`)}</span>
        </Fragment>,
      );
      i = end;
      continue;
    }

    // a^b → superscript, a_b → subscript (only when a real script token follows)
    if ((ch === '^' || ch === '_') && buf.length > 0) {
      const script = readScript(text, i + 1);
      if (script) {
        flush();
        const nodes = parse(script.token, `${keyPrefix}s${k}_`);
        out.push(
          ch === '^' ? (
            <sup key={`${keyPrefix}sup${k++}`}>{nodes}</sup>
          ) : (
            <sub key={`${keyPrefix}sub${k++}`}>{nodes}</sub>
          ),
        );
        i = script.end;
        continue;
      }
    }

    buf += ch;
    i++;
  }
  flush();
  return out;
}

/** Render plain-text math (powers, subscripts, roots) as formatted inline nodes. */
export function MathText({ text, className }: { text: string; className?: string }): ReactNode {
  const nodes = parse(text);
  return className ? <span className={className}>{nodes}</span> : <>{nodes}</>;
}
