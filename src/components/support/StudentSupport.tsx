'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createTicket,
  getMyTicket,
  listMyTickets,
  replyToTicket,
} from '@/lib/api/support';
import type { TicketDetailDto, TicketDto } from '@/shared/dto/support.dto';
import { describeError } from '@/lib/api/errors';
import { ArrowLeft, Loader2, MessageSquarePlus, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'thread'; id: string };

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
    return <NewTicket onDone={() => { setView({ mode: 'list' }); load(); }} onCancel={() => setView({ mode: 'list' })} />;
  }
  if (view.mode === 'thread') {
    return <Thread id={view.id} onBack={() => { setView({ mode: 'list' }); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setView({ mode: 'new' })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange/90"
        >
          <MessageSquarePlus className="size-4" /> New ticket
        </button>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No tickets yet. Open one if you need help.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <li key={t.id}>
                <button onClick={() => setView({ mode: 'thread', id: t.id })} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{t.subject}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(t.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {t.category ? ` · ${t.category}` : ''}
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
    </div>
  );
}

function NewTicket({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
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
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy">
        <ArrowLeft className="size-4" /> Back
      </button>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Subject</span>
        <input required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder="Briefly, what's the issue?" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Category (optional)</span>
        <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="e.g. Billing, Bug, Content" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Describe your issue</span>
        <textarea required rows={6} value={body} onChange={(e) => setBody(e.target.value)} className={inputCls} />
      </label>
      <button type="submit" disabled={saving || !subject.trim() || !body.trim()} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange/90 disabled:opacity-50">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Submit ticket
      </button>
    </form>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<TicketDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy">
        <ArrowLeft className="size-4" /> Back to tickets
      </button>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
      ) : !ticket ? (
        <p className="text-sm text-red-500">{error ?? 'Not found.'}</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-navy">{ticket.subject}</h2>
              <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLE[ticket.status] ?? 'bg-slate-100 text-slate-600')}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {ticket.messages.map((m) => (
              <div key={m.id} className={cn('flex', m.isStaff ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm', m.isStaff ? 'bg-slate-100 text-slate-700' : 'bg-orange/10 text-navy')}>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {m.isStaff ? 'Support' : 'You'} · {new Date(m.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="px-4 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 border-t border-slate-100 p-4">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a reply…"
              className={inputCls}
            />
            <button onClick={send} disabled={sending || !reply.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange/90 disabled:opacity-50">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
