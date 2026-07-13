'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  createTicket,
  getMyTicket,
  listMyTickets,
  replyToTicket,
} from '@/lib/api/support';
import type { TicketDetailDto, TicketDto } from '@/shared/dto/support.dto';
import { describeError } from '@/lib/api/errors';
import {
  ArrowLeft, BookOpen, Bug, CheckCircle2, ClipboardList, CreditCard, Headset,
  HelpCircle, Loader2, MessageSquarePlus, MessagesSquare, Send, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

const HELP_TOPICS = [
  { icon: User, label: 'Account & login', category: 'Account' },
  { icon: CreditCard, label: 'Billing & plans', category: 'Billing' },
  { icon: BookOpen, label: 'Course content', category: 'Course content' },
  { icon: ClipboardList, label: 'Assessments', category: 'Assessment' },
  { icon: Bug, label: 'Something is broken', category: 'Technical issue' },
  { icon: HelpCircle, label: 'Something else', category: 'Other' },
];
const CATEGORIES = ['Account', 'Billing', 'Course content', 'Assessment', 'Technical issue', 'Other'];

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type View = { mode: 'list' } | { mode: 'new'; category?: string } | { mode: 'thread'; id: string };

export function StudentSupport() {
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ mode: 'list' });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTickets(await listMyTickets());
    } catch {
      setError('Failed to load your tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (view.mode === 'new') {
    return <NewTicket initialCategory={view.category} onDone={() => { setView({ mode: 'list' }); load(); }} onCancel={() => setView({ mode: 'list' })} />;
  }
  if (view.mode === 'thread') {
    return <Thread id={view.id} onBack={() => { setView({ mode: 'list' }); load(); }} />;
  }

  const openCount = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Quick help */}
      <div data-tour="support:topics">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">What do you need help with?</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {HELP_TOPICS.map((h) => {
            const Icon = h.icon;
            return (
              <button
                key={h.category}
                onClick={() => setView({ mode: 'new', category: h.category })}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:border-orange/40 hover:shadow"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange/10 text-orange transition-colors group-hover:bg-orange group-hover:text-[#171717]">
                  <Icon className="size-4.5" />
                </span>
                <span className="text-[13px] font-semibold leading-tight text-navy">{h.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets header */}
      <div data-tour="support:new-ticket" className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-navy">Your tickets</h2>
          {openCount > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{openCount} open</span>}
        </div>
        <button
          onClick={() => setView({ mode: 'new' })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange to-[#f5872f] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:shadow"
        >
          <MessageSquarePlus className="size-4" /> New ticket
        </button>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div data-tour="support:tickets" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-500" /></div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-slate-50"><Headset className="size-6 text-slate-400" /></div>
            <div>
              <p className="text-sm font-semibold text-navy">No tickets yet</p>
              <p className="mt-0.5 text-xs text-slate-500">Pick a topic above or open a ticket - we usually reply within a day.</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <li key={t.id}>
                <button onClick={() => setView({ mode: 'thread', id: t.id })} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50/70">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                    <MessagesSquare className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy">{t.subject}</p>
                    <p className="text-xs text-slate-500">
                      {timeAgo(t.lastMessageAt)}{t.category ? ` · ${t.category}` : ''}
                    </p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLE[t.status] ?? 'bg-slate-100 text-slate-600')}>
                    {t.status.replace('_', ' ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

function NewTicket({ initialCategory, onDone, onCancel }: { initialCategory?: string; onDone: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(initialCategory ?? '');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createTicket({ subject: subject.trim(), body: body.trim(), category: category.trim() || null });
      onDone();
    } catch (err) {
      setError(describeError(err, 'Failed to open the ticket.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy">
        <ArrowLeft className="size-4" /> Back
      </button>
      <div>
        <h2 className="text-lg font-bold text-navy">Open a support ticket</h2>
        <p className="mt-0.5 text-sm text-slate-600">Tell us what&apos;s going on - we usually reply within a day.</p>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Subject</span>
        <input required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Briefly, what's the issue?" />
      </label>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-slate-600">Category</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory((prev) => (prev === c ? '' : c))}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                category === c ? 'border-orange bg-orange/10 text-orange shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Describe your issue</span>
        <textarea required rows={6} value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} placeholder="Steps you took, what you expected, and what happened…" />
      </label>

      <button type="submit" disabled={saving || !subject.trim() || !body.trim()} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange to-[#f5872f] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow disabled:opacity-50">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit ticket
      </button>
    </motion.form>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<TicketDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTicket(await getMyTicket(id));
    } catch {
      setError('Failed to load the ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages.length]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      setTicket(await replyToTicket(id, { body: reply.trim() }));
      setReply('');
    } catch (err) {
      setError(describeError(err, 'Failed to send.'));
    } finally {
      setSending(false);
    }
  };

  const closed = ticket && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED');

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy">
        <ArrowLeft className="size-4" /> Back to tickets
      </button>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-500" /></div>
      ) : !ticket ? (
        <p className="text-sm text-red-500">{error ?? 'Not found.'}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div className="min-w-0">
              <h2 className="truncate font-bold text-navy">{ticket.subject}</h2>
              {ticket.category && <p className="text-xs text-slate-500">{ticket.category}</p>}
            </div>
            <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLE[ticket.status] ?? 'bg-slate-100 text-slate-600')}>
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
          <div className="max-h-[52vh] space-y-3 overflow-y-auto bg-slate-50/40 p-4">
            {ticket.messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-2', m.isStaff ? 'justify-start' : 'flex-row-reverse')}>
                <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white', m.isStaff ? 'bg-navy' : 'bg-orange')}>
                  {m.isStaff ? <Headset className="size-3.5" /> : 'You'}
                </span>
                <div className={cn('max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm', m.isStaff ? 'rounded-bl-sm bg-white text-slate-700' : 'rounded-br-sm bg-orange/10 text-navy')}>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {m.isStaff ? 'Support' : 'You'} · {new Date(m.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>
          {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}
          {closed ? (
            <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 bg-green-50/50 p-3 text-xs font-medium text-green-700">
              <CheckCircle2 className="size-4" /> This ticket is {ticket.status.toLowerCase()}. Reply to reopen the conversation.
            </div>
          ) : null}
          <div className="flex items-end gap-2 border-t border-slate-100 p-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Type a reply…  (Enter to send, Shift+Enter for a new line)"
              className={cn(inputCls, 'max-h-32 resize-none')}
            />
            <button onClick={send} disabled={sending || !reply.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-[#171717] hover:bg-orange/90 disabled:opacity-50">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
