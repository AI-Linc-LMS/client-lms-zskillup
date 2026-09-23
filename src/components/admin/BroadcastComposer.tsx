'use client';

import { useEffect, useMemo, useState } from 'react';
import { getMe } from '@/lib/api/me';
import {
  listAdminColleges,
  listAdminCollegeCohorts,
  type AdminCohortRow,
  type AdminCollegeRow,
} from '@/lib/api/admin';
import { sendBroadcast } from '@/lib/api/broadcasts';
import { describeError } from '@/lib/api/errors';
import type {
  BroadcastChannel,
  BroadcastResultDto,
  BroadcastScope,
} from '@/shared/dto/broadcast.dto';
import { BadgeCheck, Loader2, Lock, Megaphone, Upload, XCircle } from 'lucide-react';

const CHANNELS: { value: BroadcastChannel; label: string; hint: string }[] = [
  { value: 'IN_APP', label: 'In-app notification', hint: 'Shows in the bell on the platform' },
  { value: 'EMAIL', label: 'Email', hint: 'Sent to their registered address' },
  { value: 'BOTH', label: 'Both', hint: 'In-app and email' },
];

/**
 * Addresses out of whatever the admin pasted or a CSV contained: commas, newlines,
 * semicolons and tabs all separate, and a "Name,Email" CSV row is read for the part
 * that looks like an address, so the same box takes a pasted list OR a pasted file.
 */
function parseEmails(text: string): string[] {
  const found = text
    .split(/[\s,;]+/)
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter((t) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t))
    .map((t) => t.toLowerCase());
  return [...new Set(found)];
}

/** What actually happened, in the admin's terms — including what did NOT land. */
function describeResult(r: BroadcastResultDto): string {
  const parts: string[] = [];
  if (r.recipients > 0) parts.push(`${r.recipients.toLocaleString()} in-app`);
  if (r.emailsQueued > 0) parts.push(`${r.emailsQueued.toLocaleString()} email${r.emailsQueued === 1 ? '' : 's'} queued`);
  const sent = parts.length ? `Broadcast sent — ${parts.join(', ')}.` : 'Broadcast sent, but it reached nobody.';
  const unknown =
    r.unknownAddresses > 0
      ? ` ${r.unknownAddresses} address${r.unknownAddresses === 1 ? '' : 'es'} matched no student account — they were emailed, but get no in-app copy.`
      : '';
  return sent + unknown;
}

const SCOPES: { value: BroadcastScope; label: string; hint: string }[] = [
  { value: 'PLATFORM', label: 'All students', hint: 'Every active student on the platform' },
  { value: 'COLLEGE', label: 'One college', hint: 'Active students at a chosen college' },
  { value: 'COHORT', label: 'One cohort', hint: 'Active students in a chosen batch' },
];

/**
 * Broadcast composer (Phase 3). Sends an in-app notification to a target
 * audience. Gated by the `canBroadcast` capability (SUPER_ADMIN always holds it);
 * an ADMIN without it sees a locked state. Group-agnostic - rendered by both the
 * /admin and /superadmin Broadcasts pages.
 */
export function BroadcastComposer() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [colleges, setColleges] = useState<AdminCollegeRow[]>([]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [scope, setScope] = useState<BroadcastScope>('PLATFORM');
  const [collegeId, setCollegeId] = useState('');
  const [cohorts, setCohorts] = useState<AdminCohortRow[]>([]);
  const [cohortId, setCohortId] = useState('');
  const [cohortsLoading, setCohortsLoading] = useState(false);

  const [channel, setChannel] = useState<BroadcastChannel>('IN_APP');
  /** Where the recipients come from: the audience above, or a list typed/uploaded. */
  const [source, setSource] = useState<'AUDIENCE' | 'LIST'>('AUDIENCE');
  const [emailText, setEmailText] = useState('');
  const [csvName, setCsvName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Declared before canSubmit, which validates against it.

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await getMe();
        if (!alive) return;
        const can = me.capabilities?.canBroadcast ?? false;
        setAllowed(can);
        if (can) {
          const list = await listAdminColleges().catch(() => [] as AdminCollegeRow[]);
          if (alive) setColleges(list.filter((c) => c.status === 'ACTIVE'));
        }
      } catch {
        if (alive) setAllowed(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load the chosen college's cohorts for the COHORT scope picker.
  useEffect(() => {
    if (scope !== 'COHORT' || !collegeId) {
      setCohorts([]);
      setCohortId('');
      return;
    }
    let alive = true;
    setCohortsLoading(true);
    setCohortId('');
    (async () => {
      try {
        const list = await listAdminCollegeCohorts(collegeId);
        if (alive) setCohorts(list);
      } catch {
        if (alive) setCohorts([]);
      } finally {
        if (alive) setCohortsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [scope, collegeId]);

  const emails = useMemo(() => parseEmails(emailText), [emailText]);

  const canSubmit = useMemo(() => {
    if (title.trim().length < 3 || body.trim().length < 3) return false;
    if (source === 'LIST') {
      // A typed list needs at least one address, and an inbox to send it to.
      if (emails.length === 0 || channel === 'IN_APP') return false;
    }
    if (source === 'AUDIENCE' && scope === 'COLLEGE' && !collegeId) return false;
    if (source === 'AUDIENCE' && scope === 'COHORT' && (!collegeId || !cohortId)) return false;
    return true;
  }, [title, body, scope, collegeId, cohortId, source, emails.length, channel]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || null,
        scope,
        channel,
        collegeId:
          source === 'AUDIENCE' && (scope === 'COLLEGE' || scope === 'COHORT') ? collegeId : undefined,
        cohortId: source === 'AUDIENCE' && scope === 'COHORT' ? cohortId : undefined,
        emails: source === 'LIST' ? emails : undefined,
      });
      setSuccess(describeResult(result));
      setTitle('');
      setBody('');
      setLink('');
      setEmailText('');
      setCsvName(null);
    } catch (err) {
      setError(describeError(err, 'Failed to send the broadcast.'));
    } finally {
      setSending(false);
    }
  };

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-center">
        <Lock className="size-8 text-slate-400" />
        <p className="max-w-sm text-sm text-slate-600">
          You don&apos;t have the <span className="font-semibold">Broadcast</span> capability. Ask a
          super-admin to grant it from your account&apos;s capabilities.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <BadgeCheck className="size-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Audience
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                scope === s.value
                  ? 'border-[#ffc42d] bg-[#fff5ea] ring-1 ring-[#ffc42d]'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-semibold text-navy">{s.label}</p>
              <p className="text-xs text-slate-500">{s.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Delivery channel
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CHANNELS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setChannel(c.value)}
              aria-pressed={channel === c.value}
              className={`rounded-lg border p-3 text-left transition-colors ${
                channel === c.value
                  ? 'border-[#ffc42d] bg-[#fff5ea] ring-1 ring-[#ffc42d]'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-semibold text-navy">{c.label}</p>
              <p className="text-xs text-slate-500">{c.hint}</p>
            </button>
          ))}
        </div>
        {channel !== 'IN_APP' ? (
          <p className="mt-1.5 text-xs text-slate-500">
            Students who turned promotional email off keep their in-app notification but
            are not emailed.
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Recipients
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['AUDIENCE', 'Use selected audience'],
              ['LIST', 'Upload CSV or paste emails'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSource(value)}
              aria-pressed={source === value}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                source === value ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {source === 'LIST' ? (
          <div className="mt-3 space-y-2">
            <label
              htmlFor="broadcast-csv"
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 p-4 text-center hover:bg-slate-50"
            >
              <Upload className="size-4 text-slate-400" aria-hidden />
              <span className="text-xs font-semibold text-navy">
                {csvName ?? 'Click to upload a CSV'}
              </span>
              <span className="text-[11px] text-slate-500">
                Any CSV with an email column — addresses are picked out of it
              </span>
            </label>
            <input
              id="broadcast-csv"
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setCsvName(file.name);
                // Parsed in the browser: the API takes addresses, so an unreadable
                // file fails here where the admin can see and fix it.
                void file.text().then((text) => setEmailText((prev) => `${prev}\n${text}`.trim()));
              }}
            />
            <label htmlFor="broadcast-emails" className="sr-only">
              Email addresses
            </label>
            <textarea
              id="broadcast-emails"
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              rows={4}
              placeholder="student1@example.com, student2@example.com"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
            />
            <p className="text-xs text-slate-500">
              {emails.length > 0
                ? `${emails.length} address${emails.length === 1 ? '' : 'es'} found.`
                : 'Commas, spaces or new lines all work.'}
              {channel === 'IN_APP' ? (
                <span className="font-semibold text-red-700">
                  {' '}
                  Pick Email or Both — a pasted address has no in-app inbox.
                </span>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>

      {source === 'AUDIENCE' && (scope === 'COLLEGE' || scope === 'COHORT') && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            College
          </label>
          <select
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
          >
            <option value="">Select a college…</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {source === 'AUDIENCE' && scope === 'COHORT' && collegeId && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Cohort
          </label>
          {cohortsLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" /> Loading cohorts…
            </div>
          ) : cohorts.length === 0 ? (
            <p className="py-2 text-sm text-slate-500">No cohorts at this college yet.</p>
          ) : (
            <select
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
            >
              <option value="">Select a cohort…</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.year ? ` (${c.year})` : ''} · {c.studentCount} student
                  {c.studentCount === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. New mock test available"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Message
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What do you want students to know?"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Link <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          maxLength={300}
          placeholder="/assessments"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#ffc42d] focus:outline-none focus:ring-1 focus:ring-[#ffc42d]"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit || sending}
        className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-[#171717] hover:bg-orange/90 disabled:opacity-50"
      >
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
        Send broadcast
      </button>
    </form>
  );
}
