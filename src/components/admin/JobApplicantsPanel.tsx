'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Send, Users } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/student/StatusPill';
import {
  emailJobApplicant,
  listJobApplicants,
  updateJobApplication,
  type JobApplicantDto,
} from '@/lib/api/jobs';
import { describeError } from '@/lib/api/errors';
import { APPLICATION_STATUS, APPLICATION_STATUS_ORDER } from '@/lib/jobs/application-status';
import { JobApplicationStatus } from '@/shared/enums';

/**
 * Everyone who applied to one role, with the two things an admin actually does here:
 * move someone along, and write to them.
 *
 * Changing the status sends the applicant an email automatically - the panel says so
 * next to the control rather than letting an admin discover it from a student's reply.
 * Re-selecting the status already set sends nothing (the server treats it as a no-op),
 * so an accidental re-save cannot spam a candidate.
 */
export function JobApplicantsPanel({
  jobId,
  jobTitle,
  onClose,
}: {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<JobApplicantDto[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [composing, setComposing] = useState<JobApplicantDto | null>(null);

  const load = useCallback(() => {
    listJobApplicants(jobId)
      .then(setRows)
      .catch((err) => {
        toast.error(describeError(err, 'Could not load applicants.'));
        setRows([]);
      });
  }, [jobId]);

  useEffect(load, [load]);

  const changeStatus = async (row: JobApplicantDto, status: JobApplicationStatus) => {
    if (status === row.status) return;
    setBusyId(row.id);
    try {
      const updated = await updateJobApplication(row.id, { status });
      setRows((prev) => prev?.map((r) => (r.id === row.id ? updated : r)) ?? null);
      toast.success(`${row.fullName ?? row.email} → ${APPLICATION_STATUS[status].label}. Email sent.`);
    } catch (err) {
      toast.error(describeError(err, 'Could not update the application.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Modal open onClose={onClose} maxWidth="max-w-3xl">
        <div className="flex items-center gap-2.5">
          <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Users className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Applicants
            </p>
            <h2 className="text-lg font-bold text-navy">{jobTitle}</h2>
          </div>
        </div>

        {rows === null ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Nobody has applied yet. Applicants appear here the moment they do.
          </p>
        ) : (
          <>
            <p className="mt-4 text-xs text-slate-500">
              {rows.length} {rows.length === 1 ? 'applicant' : 'applicants'} · changing a
              status emails the candidate automatically.
            </p>
            <ul className="mt-3 max-h-[55vh] divide-y divide-slate-100 overflow-y-auto">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-navy">
                      {r.fullName ?? 'Unnamed student'}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill
                      tone={APPLICATION_STATUS[r.status].tone}
                      label={APPLICATION_STATUS[r.status].label}
                    />
                    <select
                      aria-label={`Status for ${r.fullName ?? r.email}`}
                      value={r.status}
                      disabled={busyId === r.id}
                      onChange={(e) =>
                        void changeStatus(r, e.target.value as JobApplicationStatus)
                      }
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                    >
                      {APPLICATION_STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {APPLICATION_STATUS[s].label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Email ${r.fullName ?? r.email}`}
                      onClick={() => setComposing(r)}
                    >
                      <Mail className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-5 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>

      {composing ? (
        <ComposeEmail applicant={composing} onClose={() => setComposing(null)} />
      ) : null}
    </>
  );
}

/** A one-off note to a single applicant, for anything the automated triggers do not say. */
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

  const send = async () => {
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
  };

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
        <Button onClick={send} disabled={sending || subject.trim().length < 3 || !body.trim()}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send email
        </Button>
      </div>
    </Modal>
  );
}
