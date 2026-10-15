'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Loader2, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api/errors';
import { label } from '@/components/admin/analytics/rate';
import {
  getDriveShares,
  getRoundRoster,
  getRoundRsvps,
  inviteToRound,
  listApplicants,
  type RoundRosterRowDto,
  type RoundRsvpDto,
  type ShareLogEntryDto,
} from '@/lib/api/jobs';
import { RSVP_LABELS, type RoundRsvpResponse } from '@/shared/drive-rounds';
import { statusMeta } from '@/lib/jobs/application-status';

const dt = (v: string | null) =>
  v
    ? new Date(v).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

function rsvpTone(r: string): string {
  if (r === 'ATTENDING') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (r === 'DECLINED') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
}

/**
 * ROUNDS, INVITES, RSVPS AND DISCLOSURES (PRD §12, §13, §18.13).
 *
 * Three things a placement team does on the day of a round, which until now existed only
 * as API endpoints: see who is in each round, invite the next batch, and read who replied.
 * Plus §13's share log — the record of what candidate data went to which employer.
 *
 * CAPACITY IS REPORTED, NOT ENFORCED. §12 asks to "show clashes and allow authorised
 * override". A team that knowingly puts thirty people into a twenty-five seat lab is
 * making a call; the software's job is to say so and then get out of the way. So an
 * over-capacity round is flagged in amber and the invite still goes through.
 *
 * EVERY FAILED INVITE IS NAMED. "38 of 41 invited" tells an operator that three people
 * need chasing without saying which three, so nobody chases them. The result lists each
 * skipped candidate and the reason the server gave.
 *
 * THE SHARE LOG IS READ-ONLY AND DELIBERATELY SO. It answers "who has this student's
 * resume?" — a question the student has a legitimate interest in and §17 requires the
 * platform to be able to answer. Nothing on this screen can edit it.
 */
export function RoundsScreen({ driveId }: { driveId: string }) {
  const [roster, setRoster] = useState<RoundRosterRowDto[]>([]);
  const [rsvps, setRsvps] = useState<RoundRsvpDto[]>([]);
  const [shares, setShares] = useState<ShareLogEntryDto[]>([]);
  const [applicants, setApplicants] = useState<Array<{ id: string; name: string; email: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteRound, setInviteRound] = useState<RoundRosterRowDto | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ro, rs, sh, ap] = await Promise.all([
        getRoundRoster(driveId),
        getRoundRsvps(driveId).catch(() => [] as RoundRsvpDto[]),
        getDriveShares(driveId).catch(() => [] as ShareLogEntryDto[]),
        listApplicants(driveId, { limit: 200 }).catch(() => null),
      ]);
      setRoster(ro);
      setRsvps(rs);
      setShares(sh);
      setApplicants(
        (ap?.items ?? []).map((r) => ({
          id: r.id,
          name: r.fullName ?? r.email,
          email: r.email,
          status: r.status,
        })),
      );
    } catch (e) {
      setError(describeError(e, 'Could not load this drive’s rounds.'));
    } finally {
      setLoading(false);
    }
  }, [driveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    if (!inviteRound || picked.size === 0) return;
    setInviting(true);
    try {
      const res = await inviteToRound(driveId, inviteRound.roundId, [...picked]);
      if (res.skipped.length === 0) {
        toast.success(`${res.invited} invited to ${res.round}.`);
      } else {
        // Named, not counted — see the note at the top of this file.
        toast.warning(
          `${res.invited} invited. ${res.skipped.length} could not be: ` +
            res.skipped
              .map((s) => `${applicants.find((a) => a.id === s.applicationId)?.name ?? s.applicationId} — ${s.reason}`)
              .join('; '),
          { duration: 12000 },
        );
      }
      if (res.capacityWarning) toast.warning(res.capacityWarning, { duration: 10000 });
      setInviteRound(null);
      setPicked(new Set());
      await load();
    } catch (e) {
      toast.error(describeError(e, 'Could not send the invites.'));
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-slate-300" aria-hidden /> Loading rounds…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
        {error}
      </p>
    );
  }

  const byRound = new Map<string, RoundRsvpDto[]>();
  for (const r of rsvps) byRound.set(r.roundId, [...(byRound.get(r.roundId) ?? []), r]);

  return (
    <section className="space-y-5">
      {/* ── ROSTER ─────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className={label}>Rounds</p>
          <p className="mt-0.5 text-base font-bold text-navy">Who is in each round right now</p>
        </div>
        {roster.length === 0 ? (
          <p className="px-5 py-5 text-sm leading-relaxed text-slate-500">
            This drive has no planned rounds. Add them on the drive’s own page — a round has
            to exist before anyone can be invited into it.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {roster.map((r) => {
              const over = r.capacity !== null && r.inRound > r.capacity;
              return (
                <li key={r.roundId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">
                      <span className="text-slate-400">{r.sequence}.</span> {r.round}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.inRound} in this round
                      {r.capacity !== null ? ` · ${r.capacity} places` : ' · no stated capacity'}
                      {(byRound.get(r.roundId) ?? []).length > 0
                        ? ` · ${(byRound.get(r.roundId) ?? []).length} replied`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {over ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                        Over capacity
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setInviteRound(r);
                        setPicked(new Set());
                      }}
                    >
                      <Users className="size-3.5" /> Invite
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {roster.some((r) => r.capacity !== null && r.inRound > r.capacity) ? (
          <p className="flex items-start gap-2 border-t border-slate-200 bg-amber-50 px-5 py-3 text-xs leading-relaxed text-amber-900">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Capacity is reported, never enforced. Putting more people in a round than it
              has places is a decision the team is allowed to make — this is the warning,
              not a block.
            </span>
          </p>
        ) : null}
      </div>

      {/* ── INVITE PICKER ──────────────────────────────────────────────────── */}
      {inviteRound ? (
        <div className="rounded-xl border border-orange/40 bg-white p-5 shadow-sm ring-1 ring-orange/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={label}>Invite to</p>
              <p className="mt-0.5 text-base font-bold text-navy">{inviteRound.round}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setInviteRound(null)}>
              Cancel
            </Button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            An assessment-backed round moves people to <strong>assessment invited</strong>; a
            panel round moves them to <strong>in a round</strong>. The difference matters to
            the candidate — one says “go and sit this”, the other says “we will be in touch
            about a time”.
          </p>
          <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-200">
            {applicants.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">No applicants to invite yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {applicants.map((a) => (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-slate-300 text-navy focus-visible:ring-2 focus-visible:ring-orange/40"
                        checked={picked.has(a.id)}
                        onChange={() =>
                          setPicked((prev) => {
                            const next = new Set(prev);
                            if (next.has(a.id)) next.delete(a.id);
                            else next.add(a.id);
                            return next;
                          })
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-navy">{a.name}</span>
                        <span className="block truncate text-xs text-slate-400">{a.email}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {statusMeta(a.status).label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={() => void send()} disabled={inviting || picked.size === 0}>
              {inviting ? <Loader2 className="size-4 animate-spin" /> : null}
              Invite {picked.size || ''}
            </Button>
            <span className="text-xs text-slate-500">
              Each invite emails the candidate and is recorded in their history.
            </span>
          </div>
        </div>
      ) : null}

      {/* ── RSVPS ──────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className={label}>Replies</p>
          <p className="mt-0.5 text-base font-bold text-navy">Who can make it</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            The latest answer per person per round. A student who declined and then changed
            their mind shows as attending — the earlier answers stay in the record, so
            whoever reschedules can see that they changed it.
          </p>
        </div>
        {rsvps.length === 0 ? (
          <p className="px-5 py-5 text-sm text-slate-500">
            Nobody has replied yet. An empty list is silence, not refusal.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rsvps.map((r, i) => (
              <li key={`${r.userId}-${r.roundId}-${i}`} className="px-5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{r.name ?? r.email}</p>
                    <p className="text-xs text-slate-400">
                      {roster.find((x) => x.roundId === r.roundId)?.round ?? r.roundId} ·{' '}
                      {dt(r.respondedAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${rsvpTone(r.response)}`}>
                    {RSVP_LABELS[r.response as RoundRsvpResponse] ?? r.response}
                  </span>
                </div>
                {/* The reason is the point: "university exam" and "another offer" lead to
                    completely different actions, and a decline with no reason gets read
                    as the second. */}
                {r.reason ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.reason}</p> : null}
                {r.preferredSlot ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarClock className="size-3.5" aria-hidden /> Would prefer: {r.preferredSlot}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── SHARE LOG (§13) ────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className={label}>Disclosures</p>
          <p className="mt-0.5 text-base font-bold text-navy">What was shared, and with whom</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Read-only, on purpose. This answers “who has this student’s resume?” — a
            question the student has a legitimate interest in, and one the platform is
            required to be able to answer. Nothing here can be edited away.
          </p>
        </div>
        {shares.length === 0 ? (
          <p className="px-5 py-5 text-sm text-slate-500">
            Nothing has been shared from this drive yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shares.map((s) => (
              <li key={s.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                      <Share2 className="size-3.5 text-slate-400" aria-hidden />
                      {s.recipient ?? s.recipientEmail ?? 'Recipient not recorded'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {dt(s.createdAt)} · {s.kind.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                    {s.candidateCount} candidate{s.candidateCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.fields.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                    >
                      {f}
                    </span>
                  ))}
                  {s.includedResumes ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                      resumes included
                    </span>
                  ) : null}
                </div>
                {s.consentBasis ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Basis recorded: {s.consentBasis}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
