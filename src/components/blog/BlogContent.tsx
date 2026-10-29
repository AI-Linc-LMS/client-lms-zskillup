import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { parseTable, type Align } from '@/lib/blog-table';

/**
 * Dependency-free markdown renderer for long-form blog bodies. Supports:
 * `##`/`###` headings, `**bold**`, `*italic*`, `` `code` ``, `[text](url)`
 * links (internal `/…` → next/link), `-`/`1.` lists, `>` quotes, ``` fences,
 * and GFM pipe TABLES. Pure (no client hooks) so it renders inside a Server
 * Component. Input is our own authored copy, so there is no untrusted-HTML
 * injection surface.
 *
 * Tables were the one common markdown construct this did not handle, and the
 * failure was silent rather than loud: a pasted table fell through to the
 * paragraph branch and shipped a wall of literal `|` characters to a public
 * page. Both the public post AND the admin editor's live preview render through
 * this one component, so they cannot disagree about what a table looks like.
 */

const INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[var(--color-text)]">
          {m[1]}
        </strong>,
      );
    } else if (m[2]) {
      nodes.push(<em key={key++}>{m[2]}</em>);
    } else if (m[3]) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[0.88em] text-[var(--color-text)]"
        >
          {m[3]}
        </code>,
      );
    } else if (m[4] && m[5]) {
      const label = m[4];
      const href = m[5];
      const cls = 'font-medium text-[var(--color-brand-strong)] underline underline-offset-2 hover:opacity-80';
      // Only allow safe schemes — never render javascript:/data: hrefs, even
      // though the body is admin-authored (defence in depth for public output).
      const safe = /^(https?:\/\/|\/|mailto:|#)/i.test(href);
      if (!safe) {
        nodes.push(label);
      } else {
        nodes.push(
          href.startsWith('/') ? (
            <Link key={key++} href={href} className={cls}>
              {label}
            </Link>
          ) : (
            <a key={key++} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
              {label}
            </a>
          ),
        );
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function BlogContent({ markdown, className }: { markdown: string; className?: string }) {
  const lines = (markdown ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (!para.length) return;
    const p = para;
    out.push(
      <p key={key++} className="mb-5 text-[1.06rem] leading-8 text-[var(--color-text-muted)]">
        {p.map((l, i) => (
          <Fragment key={i}>
            {renderInline(l)}
            {i < p.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </p>,
    );
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const { ordered, items } = list;
    const inner = items.map((it, i) => (
      <li key={i} className="pl-1.5 text-[1.06rem] leading-8 text-[var(--color-text-muted)]">
        {renderInline(it)}
      </li>
    ));
    out.push(
      ordered ? (
        <ol key={key++} className="mb-6 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-[var(--color-brand-strong)]">
          {inner}
        </ol>
      ) : (
        <ul key={key++} className="mb-6 list-disc space-y-2 pl-6 marker:text-[var(--color-brand-strong)]">
          {inner}
        </ul>
      ),
    );
    list = null;
  };
  let quote: string[] | null = null;
  const flushQuote = () => {
    if (!quote) return;
    const q = quote;
    out.push(
      <blockquote
        key={key++}
        className="mb-6 border-l-4 border-[var(--color-brand-strong)] pl-4 text-[1.06rem] italic leading-8 text-[var(--color-text-muted)]"
      >
        {q.map((l, i) => (
          <Fragment key={i}>
            {renderInline(l)}
            {i < q.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </blockquote>,
    );
    quote = null;
  };
  let inCode = false;
  let codeLines: string[] = [];

  // Indexed rather than for-of: a table is recognised by looking AHEAD one line to its
  // `|---|` delimiter, which a for-of loop cannot do.
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, '');
    const fence = /^```(\w*)\s*$/.exec(line);
    // Inside a ``` fenced block everything is literal until the closing fence.
    if (inCode) {
      if (fence) {
        const code = codeLines.join('\n');
        out.push(
          <pre
            key={key++}
            className="mb-6 overflow-x-auto rounded-lg bg-[var(--color-surface-2)] p-4 text-[0.9rem] leading-6"
          >
            <code className="font-mono text-[var(--color-text)]">{code}</code>
          </pre>,
        );
        inCode = false;
        codeLines = [];
      } else {
        codeLines.push(raw);
      }
      continue;
    }
    if (fence) {
      flushPara();
      flushList();
      flushQuote();
      inCode = true;
      codeLines = [];
      continue;
    }
    // ── GFM table ────────────────────────────────────────────────────────────
    // Header row + delimiter row, with the SAME number of cells. Requiring the cell
    // counts to match stops a line of prose that happens to contain a pipe from
    // swallowing the paragraph after it.
    if (line.includes('|')) {
      const table = parseTable(lines, i);
      if (table) {
        const { header, aligns } = table;
        flushPara();
        flushList();
        flushQuote();
        const rows = table.rows;
        out.push(
          // overflow-x-auto on a wrapper, not the table: a wide comparison table is
          // normal in these posts and must scroll in its own box rather than make the
          // whole page scroll sideways on a phone.
          <div key={key++} className="mb-6 overflow-x-auto rounded-xl border border-[var(--color-line)]">
            <table className="w-full border-collapse text-left text-[0.97rem]">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
                  {header.map((h, c) => (
                    <th
                      key={c}
                      scope="col"
                      className={cn(
                        'whitespace-nowrap px-4 py-3 font-bold text-[var(--color-text)]',
                        ALIGN_CLASS[aligns[c] ?? 'left'],
                      )}
                    >
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="border-b border-[var(--color-line)] last:border-0">
                    {r.map((cellText, c) => (
                      <td
                        key={c}
                        className={cn(
                          'px-4 py-3 align-top leading-7 text-[var(--color-text-muted)]',
                          ALIGN_CLASS[aligns[c] ?? 'left'],
                        )}
                      >
                        {renderInline(cellText)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        i = table.endIndex;
        continue;
      }
    }

    const quoteM = /^>\s?(.*)$/.exec(line);
    const h2 = /^##\s+(.*)$/.exec(line);
    const h3 = /^###\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (h3) {
      flushPara();
      flushList();
      flushQuote();
      out.push(
        <h3 key={key++} className="mb-2.5 mt-8 text-xl font-bold tracking-tight text-[var(--color-text)]">
          {renderInline(h3[1])}
        </h3>,
      );
    } else if (h2) {
      flushPara();
      flushList();
      flushQuote();
      out.push(
        <h2 key={key++} className="mb-3 mt-11 text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
          {renderInline(h2[1])}
        </h2>,
      );
    } else if (quoteM) {
      flushPara();
      flushList();
      (quote ??= []).push(quoteM[1]);
    } else if (ordered) {
      flushPara();
      flushQuote();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
    } else if (bullet) {
      flushPara();
      flushQuote();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
      flushQuote();
    } else {
      flushList();
      flushQuote();
      para.push(line);
    }
  }
  // Close any block left open at EOF (incl. an unterminated code fence).
  if (inCode && codeLines.length) {
    out.push(
      <pre key={key++} className="mb-6 overflow-x-auto rounded-lg bg-[var(--color-surface-2)] p-4 text-[0.9rem] leading-6">
        <code className="font-mono text-[var(--color-text)]">{codeLines.join('\n')}</code>
      </pre>,
    );
  }
  flushPara();
  flushList();
  flushQuote();

  return <div className={cn('[&>h2:first-child]:mt-0', className)}>{out}</div>;
}

/** Rough reading-time estimate (200 wpm) from a markdown/plain body. */
export function readingMinutes(body: string): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
