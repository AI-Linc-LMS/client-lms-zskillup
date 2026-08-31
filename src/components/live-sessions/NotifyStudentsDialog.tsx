'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Megaphone } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import {
  listLiveSessionNotifications,
  notifyLiveSession,
  type LiveSessionDto,
} from '@/lib/api/live-sessions';
import type { EntityNotificationSendDto } from '@/shared/dto/entity-notify.dto';
import {
  listAdminColleges,
  listAdminCollegeCohorts,
  type AdminCohortRow,
  type AdminCollegeRow,
} from '@/lib/api/admin';
import type { EntityNotifyScope } from '@/shared/dto/entity-notify.dto';
import { describeError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

const input =
  'mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';
const labelCls = 'text-[10px] font-semibold uppercase tracking-widest text-slate-400';

const SCOPES: { value: EntityNotifyScope; label: string }[] = [
  { value: 'PLATFORM', label: 'All students' },
  { value: 'COLLEGE', label: 'One college' },
  { value: 'COHORT', label: 'One cohort' },
];

/**
 * Notify students ABOUT a live session - a decision deliberately kept separate from
 * scheduling it. An admin fixes a date weeks ahead and reminds a cohort the day before;
 * those two actions should not have to share a timestamp. It sends now, never touches
 * the schedule, and can be sent again.
 */
export function NotifyStudentsDialog({
  session,
  open,
  onClose,
  onSent,
}: {
  session: LiveSessionDto | null;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState<EntityNotifyScope>('PLATFORM');
  const [colleges, setColleges] = useState<AdminCollegeRow[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [cohorts, setCohorts] = useState<AdminCohortRow[]>([]);
  const [cohortId, setCohortId] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<EntityNotificationSendDto[] | null>(null);

  // Reset the form each time a different session is opened, prefilling a sensible title,
  // and load what has already been sent (this session's notifications are repeatable).
  useEffect(() => {
    if (!session) return;
    setTitle(`Reminder: ${session.title}`);
    setBody('');
    setScope('PLATFORM');
    setCollegeId('');
    setCohortId('');
    setHistory(null);
    listLiveSessionNotifications(session.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [session]);

  // Colleges are needed the moment the audience narrows below the whole platform.
  useEffect(() => {
    if ((scope === 'COLLEGE' || scope === 'COHORT') && colleges.length === 0) {
      listAdminColleges()
        .then((c) => setColleges(c.filter((x) => x.status !== 'SUSPENDED')))
        .catch(() => setColleges([]));
    }
  }, [scope, colleges.length]);

  // Cohorts belong to a college, so they load only once one is picked in COHORT scope.
  useEffect(() => {
    if (scope === 'COHORT' && collegeId) {
      listAdminCollegeCohorts(collegeId)
        .then(setCohorts)
        .catch(() => setCohorts([]));
    } else {
      setCohorts([]);
    }
  }, [scope, collegeId]);

  if (!session) return null;

  const invalid =
    title.trim().length < 3 ||
    body.trim().length < 1 ||
    (scope === 'COLLEGE' && !collegeId) ||
    (scope === 'COHORT' && (!collegeId || !cohortId));

  const send = async () => {
    setSending(true);
    try {
      const { recipients } = await notifyLiveSession(session.id, {
        title: title.trim(),
        body: body.trim(),
        scope,
        collegeId: scope !== 'PLATFORM' ? collegeId : undefined,
        cohortId: scope === 'COHORT' ? cohortId : undefined,
      });
      toast.success(`Notified ${recipients} ${recipients === 1 ? 'student' : 'students'}.`);
      setBody('');
      onSent?.();
      // Stay open and refresh the log — sending again (a later reminder) is the point.
      listLiveSessionNotifications(session.id)
        .then(setHistory)
        .catch(() => undefined);
    } catch (err) {
      toast.error(describeError(err, 'Could not send the notification.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <p className={labelCls}>Notify students</p>
      <h2 className="mt-1 text-lg font-bold text-navy">{session.title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Sends an in-app notification now. It never changes the schedule, and you can send it
        again closer to the time.
      </p>

      <div className="mt-4">
        <span className={labelCls}>Audience</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              aria-pressed={scope === s.value}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                scope === s.value
                  ? 'bg-navy text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {scope !== 'PLATFORM' ? (
        <label className="mt-3 block">
          <span className={labelCls}>College</span>
          <select
            value={collegeId}
            onChange={(e) => {
              setCollegeId(e.target.value);
              setCohortId('');
            }}
            className={input}
          >
            <option value="">Pick a college…</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {scope === 'COHORT' && collegeId ? (
        <label className="mt-3 block">
          <span className={labelCls}>Cohort</span>
          <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className={input}>
            <option value="">Pick a cohort…</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="mt-3 block">
        <span className={labelCls}>Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className={input}
        />
      </label>

      <label className="mt-3 block">
        <span className={labelCls}>Message</span>
        <textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="What should students know? e.g. Starts in 1 hour - join from your calendar."
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </label>

      {history && history.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <span className={labelCls}>Sent so far</span>
          <ul className="mt-2 space-y-1.5">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-2 text-xs text-slate-500"
              >
                <span className="min-w-0 truncate">
                  {h.title} · {SCOPES.find((s) => s.value === h.scope)?.label ?? h.scope}
                </span>
                <span className="shrink-0 tabular-nums">
                  {h.recipients} ·{' '}
                  {new Date(h.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={sending}>
          {history && history.length > 0 ? 'Done' : 'Cancel'}
        </Button>
        <Button onClick={send} disabled={sending || invalid}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
          {history && history.length > 0 ? 'Send another' : 'Send notification'}
        </Button>
      </div>
    </Modal>
  );
}
