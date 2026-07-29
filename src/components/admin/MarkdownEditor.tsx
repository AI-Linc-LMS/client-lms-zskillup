'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  Bold,
  Code,
  Eye,
  EyeOff,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  SquareCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlogContent } from '@/components/blog/BlogContent';

/**
 * Dependency-free rich editor for blog bodies. The toolbar applies markdown to
 * the current selection and a live pane renders it with the SAME renderer the
 * public blog uses (BlogContent) — so what the author sees is exactly what ships.
 *
 * Markdown-backed on purpose: the pipeline stays markdown end-to-end (no storage
 * change, no migration, existing posts untouched) and it is XSS-safe by
 * construction — BlogContent builds React nodes from tokens and never interprets
 * raw HTML, so there is no need for a hand-rolled sanitizer or a new dependency.
 */

type Sel = { value: string; selStart: number; selEnd: number };

/** Wrap the current selection in inline markers (bold/italic/code). */
function wrapInline(v: string, s: number, e: number, before: string, after = before): Sel {
  const sel = v.slice(s, e);
  const value = v.slice(0, s) + before + sel + after + v.slice(e);
  return { value, selStart: s + before.length, selEnd: s + before.length + sel.length };
}

/** Expand [s,e] to cover whole lines. */
function lineRange(v: string, s: number, e: number): { start: number; end: number } {
  const start = v.lastIndexOf('\n', s - 1) + 1;
  const nl = v.indexOf('\n', e);
  return { start, end: nl === -1 ? v.length : nl };
}

/** Apply a per-line transform across every line the selection touches. */
function mapLines(v: string, s: number, e: number, fn: (line: string, i: number) => string): Sel {
  const { start, end } = lineRange(v, s, e);
  const block = v.slice(start, end);
  const newBlock = block.split('\n').map(fn).join('\n');
  const value = v.slice(0, start) + newBlock + v.slice(end);
  return { value, selStart: start, selEnd: start + newBlock.length };
}

const stripList = (ln: string) => ln.replace(/^(\s*([-*•]|\d+[.)])\s+)/, '');
const stripHeading = (ln: string) => ln.replace(/^#{1,6}\s+/, '');
const stripQuote = (ln: string) => ln.replace(/^>\s?/, '');

/** Wrap the selected lines in a ``` fenced code block. */
function fenceBlock(v: string, s: number, e: number): Sel {
  const { start, end } = lineRange(v, s, e);
  const block = v.slice(start, end);
  const newBlock = '```\n' + block + '\n```';
  const value = v.slice(0, start) + newBlock + v.slice(end);
  return { value, selStart: start + 4, selEnd: start + 4 + block.length };
}

/** Insert a [text](url) link, selecting the "url" placeholder for quick editing. */
function makeLink(v: string, s: number, e: number): Sel {
  const sel = v.slice(s, e) || 'link text';
  const insert = `[${sel}](url)`;
  const value = v.slice(0, s) + insert + v.slice(e);
  const urlStart = s + 1 + sel.length + 2; // past `[sel](`
  return { value, selStart: urlStart, selEnd: urlStart + 3 };
}

export function MarkdownEditor({
  value,
  onChange,
  rows = 14,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<[number, number] | null>(null);
  const [preview, setPreview] = useState(true);

  // Restore the caret/selection after a toolbar edit re-renders the textarea.
  useLayoutEffect(() => {
    if (pending.current && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(pending.current[0], pending.current[1]);
      pending.current = null;
    }
  });

  const run = (fn: (v: string, s: number, e: number) => Sel) => {
    const el = ref.current;
    if (!el) return;
    const res = fn(el.value, el.selectionStart, el.selectionEnd);
    pending.current = [res.selStart, res.selEnd];
    onChange(res.value);
  };

  const heading = (hashes: string) => (v: string, s: number, e: number) =>
    mapLines(v, s, e, (ln) => `${hashes} ${stripHeading(ln)}`);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); run((v, s, ee) => wrapInline(v, s, ee, '**')); }
    else if (k === 'i') { e.preventDefault(); run((v, s, ee) => wrapInline(v, s, ee, '*')); }
    else if (k === 'k') { e.preventDefault(); run(makeLink); }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 px-2 py-1.5">
        <Tb title="Bold  (⌘B)" onClick={() => run((v, s, e) => wrapInline(v, s, e, '**'))}><Bold className="size-4" /></Tb>
        <Tb title="Italic  (⌘I)" onClick={() => run((v, s, e) => wrapInline(v, s, e, '*'))}><Italic className="size-4" /></Tb>
        <Divider />
        <Tb title="Heading" onClick={() => run(heading('##'))}><Heading2 className="size-4" /></Tb>
        <Tb title="Subheading" onClick={() => run(heading('###'))}><Heading3 className="size-4" /></Tb>
        <Divider />
        <Tb title="Bulleted list" onClick={() => run((v, s, e) => mapLines(v, s, e, (ln) => `- ${stripList(ln)}`))}><List className="size-4" /></Tb>
        <Tb title="Numbered list" onClick={() => run((v, s, e) => mapLines(v, s, e, (ln, i) => `${i + 1}. ${stripList(ln)}`))}><ListOrdered className="size-4" /></Tb>
        <Tb title="Quote" onClick={() => run((v, s, e) => mapLines(v, s, e, (ln) => `> ${stripQuote(ln)}`))}><Quote className="size-4" /></Tb>
        <Divider />
        <Tb title="Inline code" onClick={() => run((v, s, e) => wrapInline(v, s, e, '`'))}><Code className="size-4" /></Tb>
        <Tb title="Code block" onClick={() => run(fenceBlock)}><SquareCode className="size-4" /></Tb>
        <Tb title="Link  (⌘K)" onClick={() => run(makeLink)}><Link2 className="size-4" /></Tb>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
        >
          {preview ? <><EyeOff className="size-3.5" /> Hide preview</> : <><Eye className="size-3.5" /> Preview</>}
        </button>
      </div>

      <div className={cn('grid', preview && 'lg:grid-cols-2 lg:divide-x lg:divide-slate-100')}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={rows}
          spellCheck
          placeholder="Write your post… use the toolbar, or markdown directly (**bold**, ## heading, - list, > quote)"
          className="w-full resize-y bg-transparent px-3 py-2.5 font-mono text-[13px] leading-relaxed text-navy placeholder:text-slate-400 focus:outline-none"
        />
        {preview && (
          <div className="min-h-[220px] overflow-x-auto px-4 py-3">
            {value.trim() ? (
              <BlogContent markdown={value} />
            ) : (
              <p className="text-sm text-slate-400">Formatted preview appears here as you type.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Toolbar button. `onMouseDown preventDefault` keeps the textarea selection alive. */
function Tb({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />;
}
