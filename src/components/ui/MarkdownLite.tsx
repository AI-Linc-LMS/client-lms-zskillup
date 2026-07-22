import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tiny, dependency-free markdown renderer for AI-authored solution text
 * (bold **…**, italic *…*, inline `code`, numbered/bulleted lists, and
 * paragraphs). Deliberately minimal - enough to render the question-solution and
 * shortcut copy without shipping a full markdown parser. Input is plain text from
 * our own solution cache, so no HTML injection surface.
 */

const INLINE = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|`([^`]+)`/g;

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] ?? m[2]) {
      nodes.push(
        <strong key={key++} className="font-bold text-navy">
          {m[1] ?? m[2]}
        </strong>,
      );
    } else if (m[3]) {
      nodes.push(<em key={key++}>{m[3]}</em>);
    } else if (m[4]) {
      nodes.push(
        <code key={key++} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-navy">
          {m[4]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (!para.length) return;
    const p = para;
    out.push(
      <p key={key++} className="mb-2.5 leading-relaxed last:mb-0">
        {p.map((l, i) => (
          <Fragment key={i}>
            {inline(l)}
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
    const inner = items.map((it, i) => <li key={i}>{inline(it)}</li>);
    out.push(
      ordered ? (
        <ol key={key++} className="mb-2.5 list-decimal space-y-1 pl-5 leading-relaxed">
          {inner}
        </ol>
      ) : (
        <ul key={key++} className="mb-2.5 list-disc space-y-1 pl-5 leading-relaxed">
          {inner}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (ordered) {
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

  return <div className={cn('text-[13.5px] text-slate-700', className)}>{out}</div>;
}
