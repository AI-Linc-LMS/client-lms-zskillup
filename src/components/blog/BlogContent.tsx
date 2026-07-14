import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Dependency-free markdown renderer for long-form blog bodies. Supports:
 * `##`/`###` headings, `**bold**`, `*italic*`, `` `code` ``, `[text](url)`
 * links (internal `/…` → next/link), and `-`/`1.` lists. Pure (no client
 * hooks) so it renders inside a Server Component. Input is our own authored
 * copy, so there is no untrusted-HTML injection surface.
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
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

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

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const h2 = /^##\s+(.*)$/.exec(line);
    const h3 = /^###\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (h3) {
      flushPara();
      flushList();
      out.push(
        <h3 key={key++} className="mb-2.5 mt-8 text-xl font-bold tracking-tight text-[var(--color-text)]">
          {renderInline(h3[1])}
        </h3>,
      );
    } else if (h2) {
      flushPara();
      flushList();
      out.push(
        <h2 key={key++} className="mb-3 mt-11 text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
          {renderInline(h2[1])}
        </h2>,
      );
    } else if (ordered) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
    } else if (bullet) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className={cn('[&>h2:first-child]:mt-0', className)}>{out}</div>;
}

/** Rough reading-time estimate (200 wpm) from a markdown/plain body. */
export function readingMinutes(body: string): number {
  const words = (body ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
