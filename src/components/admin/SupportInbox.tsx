'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAdminTicket,
  listAllTickets,
  replyToTicketAsStaff,
  updateTicket,
} from '@/lib/api/support';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketDetailDto,
  type TicketDto,
  type TicketPriorityValue,
  type TicketStatusValue,
} from '@/shared/dto/support.dto';
import { describeError } from '@/lib/api/errors';
import { ArrowLeft, ChevronDown, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};
const PRIORITY_STYLE: Record<string, string> = {
  URGENT: 'text-red-600',
  HIGH: 'text-orange-600',
  NORMAL: 'text-slate-500',
  LOW: 'text-slate-400',
};
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

export function SupportInbox() {
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTickets(await listAllTickets(statusFilter || undefined));
    } catch {
      setError('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (openId) {
    return <StaffThread id={openId} onBack={() => { setOpenId(null); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="relative w-48">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cn(inputCls, 'appearance-none pr-8')}>
          <option value="">All statuses</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No tickets.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} onClick={() => setOpenId(t.id)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{t.subject}</p>
                      {t.category && <p className="text-xs text-slate-400">{t.category}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.requesterName ?? t.requesterEmail ?? '—'}
                    </td>
                    <td className={cn('px-4 py-3 text-xs font-semibold', PRIORITY_STYLE[t.priority])}>{t.priority}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLE[t.status] ?? 'bg-slate-100 text-slate-600')}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(t.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StaffThread({ id, onBack }: { id: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<TicketDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTicket(await getAdminTicket(id));
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
    setBusy(true);
    setError(null);
    try {
      setTicket(await replyToTicketAsStaff(id, { body: reply.trim() }));
      setReply('');
    } catch (err) {
      setError(describeError(err, 'Failed to send.'));
    } finally {
      setBusy(false);
    }
  };

  const setField = async (patch: { status?: TicketStatusValue; priority?: TicketPriorityValue }) => {
    setBusy(true);
    setError(null);
    try {
      setTicket(await updateTicket(id, patch));
    } catch (err) {
      setError(describeError(err, 'Failed to update.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy">
        <ArrowLeft className="size-4" /> Back to inbox
      </button>
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-slate-400" /></div>
      ) : !ticket ? (
        <p className="text-sm text-red-500">{error ?? 'Not found.'}</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-3 border-b border-slate-100 p-4">
            <div>
              <h2 className="font-bold text-navy">{ticket.subject}</h2>
              <p className="text-xs text-slate-400">
                {ticket.requesterName ?? ticket.requesterEmail ?? 'Unknown'} · opened{' '}
                {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="text-xs text-slate-500">
                Status
                <select value={ticket.status} onChange={(e) => setField({ status: e.target.value as TicketStatusValue })} disabled={busy} className={cn(inputCls, 'mt-1 w-40')}>
                  {TICKET_STATUSES.map((s) => (<option key={s} value={s}>{s.replace('_', ' ')}</option>))}
                </select>
              </label>
              <label className="text-xs text-slate-500">
                Priority
                <select value={ticket.priority} onChange={(e) => setField({ priority: e.target.value as TicketPriorityValue })} disabled={busy} className={cn(inputCls, 'mt-1 w-40')}>
                  {TICKET_PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </label>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {ticket.messages.map((m) => (
              <div key={m.id} className={cn('flex', m.isStaff ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm', m.isStaff ? 'bg-orange/10 text-navy' : 'bg-slate-100 text-slate-700')}>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {m.isStaff ? (m.authorName ?? 'Support') : (m.authorName ?? 'User')} · {new Date(m.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
              placeholder="Reply to the requester…"
              className={inputCls}
            />
            <button onClick={send} disabled={busy || !reply.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange/90 disabled:opacity-50">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
