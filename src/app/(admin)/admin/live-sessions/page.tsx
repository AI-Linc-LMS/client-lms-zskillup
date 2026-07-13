'use client';

import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Clock, ExternalLink, Loader2, Pencil, PlayCircle, PlusCircle, Trash2, Users, Video } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteLiveSession,
  listAdminLiveSessions,
  type LiveSessionDto,
  type LiveSessionListDto,
} from '@/lib/api/live-sessions';
import { AudiencePill, fmtWhen, safeHttpUrl, StatusBadge } from '@/components/live-sessions/ui';
import { SessionComposer } from '@/components/live-sessions/SessionComposer';

export default function AdminLiveSessionsPage() {
  const [data, setData] = useState<LiveSessionListDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<LiveSessionDto | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listAdminLiveSessions()
      .then(setData)
      .catch(() => setData({ upcoming: [], past: [] }))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const remove = async (s: LiveSessionDto) => {
    if (!window.confirm(`Delete "${s.title}"? Students will no longer see it.`)) return;
    try {
      await deleteLiveSession(s.id);
      toast.success('Session removed.');
      load();
    } catch {
      toast.error('Could not delete the session.');
    }
  };

  const openNew = () => {
    setEditing(null);
    setComposerOpen(true);
  };
  const openEdit = (s: LiveSessionDto) => {
    setEditing(s);
    setComposerOpen(true);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Platform Admin', href: '/admin/dashboard' }, { label: 'Live Sessions' }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Engagement</p>
          <h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold tracking-tight text-navy">
            <Video className="size-6 text-[#f5b400]" /> Live Sessions
          </h1>
          <p className="mt-1 text-sm text-slate-600">Schedule Zoom / Meet sessions - students get notified and see them in-app.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-full btn-brand px-4 py-2.5 text-sm font-bold">
          <PlusCircle className="size-4" /> New session
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="size-7 animate-spin text-slate-500" /></div>
      ) : (
        <>
          <Section title="Upcoming" count={data?.upcoming.length ?? 0}>
            {data && data.upcoming.length > 0 ? (
              data.upcoming.map((s) => <AdminRow key={s.id} s={s} onEdit={openEdit} onDelete={remove} />)
            ) : (
              <EmptyState onNew={openNew} />
            )}
          </Section>

          {data && data.past.length > 0 && (
            <Section title="Past" count={data.past.length}>
              {data.past.map((s) => <AdminRow key={s.id} s={s} onEdit={openEdit} onDelete={remove} />)}
            </Section>
          )}
        </>
      )}

      <SessionComposer open={composerOpen} editing={editing} onClose={() => setComposerOpen(false)} onSaved={load} />
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">
        {title} <span className="text-slate-400">· {count}</span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function AdminRow({
  s,
  onEdit,
  onDelete,
}: {
  s: LiveSessionDto;
  onEdit: (s: LiveSessionDto) => void;
  onDelete: (s: LiveSessionDto) => void;
}) {
  const link = safeHttpUrl(s.meetingUrl);
  const recording = safeHttpUrl(s.recordingUrl);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} />
            <AudiencePill audience={s.audience} companyName={s.companyName} />
          </div>
          <h3 className="mt-2 text-base font-black text-navy">{s.title}</h3>
          {s.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{s.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {fmtWhen(s.scheduledAt)} · {s.durationMinutes}m</span>
            {s.reachCount != null && <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {s.reachCount.toLocaleString()} students</span>}
            {recording && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                <PlayCircle className="size-3" /> Recording
              </span>
            )}
            <span className="text-slate-500">by {s.hostName}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Open link">
              <ExternalLink className="size-3.5" />
            </a>
          )}
          <button onClick={() => onEdit(s)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-slate-50"><Pencil className="size-3.5" /></button>
          <button onClick={() => onDelete(s)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"><Trash2 className="size-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <Video className="mx-auto size-9 text-slate-400" />
      <p className="mt-2 text-sm text-slate-600">No upcoming sessions. Schedule one to notify students.</p>
      <button onClick={onNew} className="mt-3 inline-flex items-center gap-2 rounded-full btn-brand px-4 py-2 text-sm font-bold">
        <PlusCircle className="size-4" /> New session
      </button>
    </div>
  );
}
