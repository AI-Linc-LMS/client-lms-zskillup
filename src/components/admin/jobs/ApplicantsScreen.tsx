'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Mail,
  Search,
  StickyNote,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';
import { Modal } from '@/components/ui/Modal';
import {
  applicantsExportUrl,
  emailJobApplicant,
  getApplicantFacets,
  listApplicants,
  updateJobApplication,
  type JobApplicantDto,
} from '@/lib/api/jobs';
import { JobApplicationStatus } from '@/shared/enums';
import { APPLICATION_STATUS, APPLICATION_STATUS_ORDER } from '@/lib/jobs/application-status';
import { describeError } from '@/lib/api/errors';
import { cn, safeHttpUrl } from '@/lib/utils';

const PAGE = 25;

/**
 * Everyone who applied to one role.
 *
 * Search and filtering go to the SERVER. Filtering a fetched page in the browser looks
 * identical on a job with nine applicants and silently lies on one with nine hundred,
 * which is exactly the job where it matters.
 */
export function ApplicantsScreen({ jobId }: { jobId: string }) {
  const [rows, setRows] = useState<JobApplicantDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<JobApplicationStatus[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState<JobApplicantDto | null>(null);
  const [composing, setComposing] = useState<JobApplicantDto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [facets, setFacets] = useState<Record<JobApplicationStatus, number> | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(0), [debounced, status]);

  const load = useCallback(() => {
    setLoading(true);
    listApplicants(jobId, {
      status: status.length ? status : undefined,
      search: debounced || undefined,
      limit: PAGE,
      offset: page * PAGE,
    })
      .then((r) => {
        setRows(r.items);
        setTotal(r.total);
        // A reload means a new set of rows - carrying a tick over to a different page
        // would apply a bulk action to someone the admin can no longer see.
        setSelected(new Set());
      })
      .catch((err) => toast.error(describeError(err, 'Could not load applicants.')))
      .finally(() => setLoading(false));
  }, [jobId, status, debounced, page]);

  useEffect(load, [load]);

  // Chip totals key on the job + search ONLY - never the selected status (a chip must
  // show its own full total while another is active) and never the page. Falls back to
  // page-derived counts if the endpoint is unavailable.
  const loadFacets = useCallback(() => {
    getApplicantFacets(jobId, { search: debounced || undefined })
      .then(setFacets)
      .catch(() => setFacets(null));
  }, [jobId, debounced]);

  useEffect(loadFacets, [loadFacets]);

  const change = async (row: JobApplicantDto, next: JobApplicationStatus) => {
    if (next === row.status) return;
    setBusyId(row.id);
    try {
      const updated = await updateJobApplication(row.id, { status: next });
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
      if (open?.id === row.id) setOpen(updated);
      loadFacets(); // a status moved - the chip totals shifted
      toast.success(`${row.fullName ?? row.email} → ${APPLICATION_STATUS[next].label}. Email sent.`);
    } catch (err) {
      toast.error(describeError(err, 'Could not update the application.'));
    } finally {
      setBusyId(null);
    }
  };

  // The private note is edited against whichever applicant is open; reset the draft
  // each time a different one is opened so it never leaks the previous person's text.
  useEffect(() => setNoteDraft(open?.note ?? ''), [open]);

  const saveNote = async () => {
    if (!open) return;
    setSavingNote(true);
    try {
      // A note-only patch carries no status, so the backend sends no email - this is
      // an internal jotting, not a candidate-facing action.
      const updated = await updateJobApplication(open.id, { note: noteDraft.trim() || null });
      setRows((prev) => prev.map((r) => (r.id === open.id ? updated : r)));
      setOpen(updated);
      toast.success('Private note saved.');
    } catch (err) {
      toast.error(describeError(err, 'Could not save the note.'));
    } finally {
      setSavingNote(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allOnPageSelected ? new Set() : new Set(rows.map((r) => r.id)));

  // Shortlist or reject everyone ticked, in one go. Each transition emails the
  // candidate exactly as a single change does, so mass actions are gated behind an
  // explicit confirm - an accidental "reject all" is a lot of emails to un-send.
  const bulkChange = async (next: JobApplicationStatus) => {
    const ids = rows.filter((r) => selected.has(r.id) && r.status !== next).map((r) => r.id);
    if (!ids.length) return;
    if (
      !window.confirm(
        `Move ${ids.length} ${ids.length === 1 ? 'applicant' : 'applicants'} to ${APPLICATION_STATUS[next].label}? Each one is emailed.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    try {
      await Promise.all(ids.map((id) => updateJobApplication(id, { status: next })));
      toast.success(
        `${ids.length} ${ids.length === 1 ? 'applicant' : 'applicants'} → ${APPLICATION_STATUS[next].label}. Emails sent.`,
      );
    } catch (err) {
      toast.error(describeError(err, 'Could not update every applicant. Reloading.'));
    } finally {
      setBulkBusy(false);
      load();
      loadFacets();
    }
  };

  const pages = Math.ceil(total / PAGE);

  const pageCounts = useMemo(() => {
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [rows]);
  // Prefer the true server totals; degrade gracefully to the loaded page's counts if
  // the facets endpoint is unavailable (e.g. before it has deployed).
  const counts: Record<string, number> = facets ?? pageCounts;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="size-4" /> All postings
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search applicants"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
          />
        </div>
        <Button asChild variant="outline">
          <a href={applicantsExportUrl(jobId, status.length ? status : undefined)} download>
            <Download className="size-4" /> Export CSV
          </a>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {APPLICATION_STATUS_ORDER.map((s) => {
          const on = status.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => setStatus(on ? status.filter((x) => x !== s) : [...status, s])}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                on ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {APPLICATION_STATUS[s].label}
              {counts[s] ? (
                <span className={cn('ml-1.5', on ? 'text-white/70' : 'text-slate-400')}>
                  {counts[s]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-500">
          {loading ? 'Loading…' : `${total} ${total === 1 ? 'applicant' : 'applicants'} · changing a status emails the candidate`}
        </p>

        {loading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <Users className="size-5" />
            </span>
            <p className="mt-3 text-sm text-slate-500">
              {status.length || debounced ? 'Nobody matches that filter.' : 'Nobody has applied yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                  aria-label="Select all applicants on this page"
                  className="size-4 rounded border-slate-300 text-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                />
                {selected.size > 0 ? `${selected.size} selected` : 'Select all on this page'}
              </label>
              {selected.size > 0 ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkBusy}
                    onClick={() => void bulkChange(JobApplicationStatus.SHORTLISTED)}
                  >
                    {bulkBusy ? <Loader2 className="size-3.5 animate-spin" /> : null} Shortlist
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={bulkBusy}
                    onClick={() => void bulkChange(JobApplicationStatus.REJECTED)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </div>
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    aria-label={`Select ${r.fullName ?? r.email}`}
                    className="size-4 shrink-0 rounded border-slate-300 text-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                  />
                  <button
                    type="button"
                    onClick={() => setOpen(r)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold text-navy">
                      {r.fullName ?? 'Unnamed student'}
                      {r.note ? (
                        <StickyNote
                          className="size-3.5 shrink-0 text-amber-500"
                          aria-label="Has a private note"
                        />
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ''}
                      {r.answers.length ? ` · ${r.answers.length} answers` : ''}
                    </p>
                  </button>

                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill
                    tone={APPLICATION_STATUS[r.status].tone}
                    label={APPLICATION_STATUS[r.status].label}
                  />
                  <select
                    aria-label={`Status for ${r.fullName ?? r.email}`}
                    value={r.status}
                    disabled={busyId === r.id}
                    onChange={(e) => void change(r, e.target.value as JobApplicationStatus)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                  >
                    {APPLICATION_STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {APPLICATION_STATUS[s].label}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="ghost" aria-label={`Email ${r.email}`} onClick={() => setComposing(r)}>
                    <Mail className="size-3.5" />
                  </Button>
                </div>
              </li>
              ))}
            </ul>
          </>
        )}

        {pages > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-3 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-xs font-semibold text-slate-500">
              Page {page + 1} of {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </section>

      {open ? (
        <Modal open onClose={() => setOpen(null)} maxWidth="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Applicant
          </p>
          <h2 className="mt-1 text-lg font-bold text-navy">{open.fullName ?? 'Unnamed student'}</h2>
          <p className="text-sm text-slate-500">
            {open.email}
            {open.phone ? ` · ${open.phone}` : ''}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusPill
              tone={APPLICATION_STATUS[open.status].tone}
              label={APPLICATION_STATUS[open.status].label}
            />
            <span className="text-xs text-slate-400">
              Applied {new Date(open.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {open.coverNote ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Their note
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {open.coverNote}
              </p>
            </div>
          ) : null}

          {open.answers.length > 0 ? (
            <dl className="mt-4 space-y-3">
              {open.answers.map((a) => (
                <div key={a.label} className="rounded-xl border border-slate-200 p-3.5">
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {a.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.answer}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-500">This posting asked no extra questions.</p>
          )}

          {safeHttpUrl(open.resumeUrl) ? (
            <a
              href={safeHttpUrl(open.resumeUrl) as string}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50"
            >
              <FileText className="size-4 text-slate-400" /> Their resume
            </a>
          ) : null}

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-700">
              <StickyNote className="size-3.5" /> Private note · your team only
            </p>
            <textarea
              rows={3}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              maxLength={2000}
              placeholder="Your assessment of this candidate - never shown to them."
              className="mt-2 w-full rounded-lg border border-amber-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={savingNote || noteDraft === (open.note ?? '')}
                onClick={saveNote}
              >
                {savingNote ? <Loader2 className="size-3.5 animate-spin" /> : null} Save note
              </Button>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setComposing(open)}>
              <Mail className="size-4" /> Email
            </Button>
            <Button onClick={() => setOpen(null)}>Close</Button>
          </div>
        </Modal>
      ) : null}

      {composing ? (
        <ComposeEmail applicant={composing} onClose={() => setComposing(null)} />
      ) : null}
    </div>
  );
}

function ComposeEmail({
  applicant,
  onClose,
}: {
  applicant: JobApplicantDto;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(`Regarding your application for ${applicant.jobTitle}`);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  return (
    <Modal open onClose={onClose}>
      <h2 className="text-lg font-bold text-navy">Email {applicant.fullName ?? 'applicant'}</h2>
      <p className="mt-1 text-sm text-slate-500">{applicant.email}</p>

      <label className="mt-4 block">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Subject
        </span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={160}
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Message
        </span>
        <textarea
          rows={7}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          placeholder="Plain text. It goes out under the ZSkillup name, so write it as the platform would."
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </label>

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={sending || subject.trim().length < 3 || !body.trim()}
          onClick={async () => {
            setSending(true);
            try {
              await emailJobApplicant(applicant.id, { subject, body });
              toast.success(`Sent to ${applicant.email}`);
              onClose();
            } catch (err) {
              toast.error(describeError(err, 'Could not send the email.'));
            } finally {
              setSending(false);
            }
          }}
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          Send email
        </Button>
      </div>
    </Modal>
  );
}
