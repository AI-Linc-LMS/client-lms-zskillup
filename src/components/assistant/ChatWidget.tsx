'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { askAssistant } from '@/lib/api/assistant';
import type { AssistantRole } from '@/shared/dto/assistant.dto';

interface Msg {
  role: AssistantRole;
  content: string;
}

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi! I'm Ziggy 👋 — your ZSkillup helper. Ask me anything about practice, pricing, mock interviews, the resume builder, or how to unlock topics.",
};
const SUGGESTIONS = [
  'What can I use for free?',
  'How much is one topic?',
  'What is the mock interview?',
  'How do I unlock a company’s questions?',
];
const STORAGE_KEY = 'zsk_assistant_v1';

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore conversation within the session.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length > 0) setMsgs(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-40)));
    } catch {
      /* ignore */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput('');
    const next = [...msgs, { role: 'user' as const, content }];
    setMsgs(next);
    setBusy(true);
    try {
      const { reply } = await askAssistant({
        messages: next.map((m) => ({ role: m.role, content: m.content })),
      });
      setMsgs((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setError('Ziggy is having trouble right now. Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  const showSuggestions = msgs.length <= 1 && !busy;

  return (
    <>
      {/* Floating launcher blob */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close help chat' : 'Open help chat'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[60] grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_16px_40px_-12px_rgba(243,112,33,0.7)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange/30 print:hidden"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex size-3.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[min(70vh,560px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_70px_-24px_rgba(11,18,32,0.5)] print:hidden">
          {/* Header */}
          <div className="flex items-center gap-3 bg-navy px-4 py-3 text-white">
            <span className="grid size-9 place-items-center rounded-xl bg-white/10">
              <Sparkles className="size-5 text-[#ffb787]" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight">Ziggy</p>
              <p className="text-[11px] text-white/60">ZSkillup help assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="ml-auto rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-orange px-3.5 py-2 text-sm font-medium text-white'
                      : 'max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2 text-sm leading-relaxed text-slate-700 shadow-sm'
                  }
                >
                  {m.role === 'user' ? m.content : renderMarkdown(m.content)}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="size-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-center text-xs font-semibold text-rose-500">{error}</p>}
            {showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-orange/50 hover:text-orange"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Ask about pricing, practice, interviews…"
              className="max-h-28 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-navy outline-none placeholder:text-slate-400 focus:border-orange/50"
            />
            <button
              type="submit"
              disabled={busy || input.trim().length === 0}
              aria-label="Send"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-orange text-white transition hover:brightness-105 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/** Inline markdown → JSX: **bold**, `code`, [text](url), and bare /route links.
 *  JSX-only (no dangerouslySetInnerHTML), so assistant text can't inject HTML. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|((?:^|\s)(\/[a-z][a-z0-9/-]{1,40}))/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(<strong key={`${keyBase}b${i}`}>{m[2]}</strong>);
    } else if (m[3]) {
      nodes.push(
        <code key={`${keyBase}c${i}`} className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-navy">
          {m[4]}
        </code>,
      );
    } else if (m[5]) {
      nodes.push(
        <Link key={`${keyBase}l${i}`} href={m[7]} className="font-semibold text-orange hover:underline">
          {m[6]}
        </Link>,
      );
    } else if (m[8]) {
      // Keep any leading whitespace the token captured, then link the /route.
      const lead = m[8].slice(0, m[8].indexOf('/'));
      if (lead) nodes.push(lead);
      nodes.push(
        <Link key={`${keyBase}r${i}`} href={m[9]} className="font-semibold text-orange hover:underline">
          {m[9]}
        </Link>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Block markdown → JSX: groups consecutive `-`/`*`/`1.` lines into lists and the
 *  rest into paragraphs (so LLM replies render with real bold, bullets, and links). */
function renderMarkdown(text: string): ReactNode {
  const lines = text.replace(/\r/g, '').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const bullet = /^\s*[-*•]\s+/;
  const numbered = /^\s*\d+[.)]\s+/;
  while (i < lines.length) {
    if (bullet.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && bullet.test(lines[i])) items.push(lines[i++].replace(bullet, ''));
      const k = key++;
      out.push(
        <ul key={k} className="my-1.5 space-y-1">
          {items.map((it, ii) => (
            <li key={ii} className="flex gap-2">
              <span className="mt-[0.4rem] size-1 shrink-0 rounded-full bg-orange" aria-hidden />
              <span>{renderInline(it, `u${k}_${ii}_`)}</span>
            </li>
          ))}
        </ul>,
      );
    } else if (numbered.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && numbered.test(lines[i])) items.push(lines[i++].replace(numbered, ''));
      const k = key++;
      out.push(
        <ol key={k} className="my-1.5 ml-4 list-decimal space-y-1">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it, `o${k}_${ii}_`)}</li>
          ))}
        </ol>,
      );
    } else if (lines[i].trim() === '') {
      i++;
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() !== '' && !bullet.test(lines[i]) && !numbered.test(lines[i])) {
        para.push(lines[i++]);
      }
      const k = key++;
      out.push(
        <p key={k} className={k > 0 ? 'mt-2' : undefined}>
          {para.map((l, li) => (
            <span key={li}>
              {li > 0 && <br />}
              {renderInline(l, `p${k}_${li}_`)}
            </span>
          ))}
        </p>,
      );
    }
  }
  return out;
}
