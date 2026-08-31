'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, GraduationCap, Globe2, Loader2, Users, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  listAdminCompanies,
  listAdminColleges,
  listAdminCollegeCohorts,
  type AdminCompanyRow,
  type AdminCohortRow,
  type AdminCollegeRow,
} from '@/lib/api/admin';
import {
  createLiveSession,
  updateLiveSession,
  LiveSessionAudience,
  type LiveSessionDto,
} from '@/lib/api/live-sessions';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { describeError } from '@/lib/api/errors';

/** ISO → value for <input type="datetime-local"> (local time, minute precision). */
function toLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionComposer({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: LiveSessionDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [when, setWhen] = useState(toLocalInput());
  const [duration, setDuration] = useState(60);
  const [audience, setAudience] = useState<LiveSessionAudience>(LiveSessionAudience.PLATFORM);
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<AdminCompanyRow[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [colleges, setColleges] = useState<AdminCollegeRow[]>([]);
  const [cohorts, setCohorts] = useState<AdminCohortRow[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [speakerRole, setSpeakerRole] = useState('');
  const [speakerCompany, setSpeakerCompany] = useState('');
  const [speakerBio, setSpeakerBio] = useState('');
  const [speakerAvatarUrl, setSpeakerAvatarUrl] = useState('');
  // Scheduling and notifying are independent — off by default. When on, creating the
  // session also fires one in-app notification; either way the admin can Notify later.
  const [notifyOnCreate, setNotifyOnCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listAdminCompanies().then(setCompanies).catch(() => {});
  }, []);

  // Colleges load the moment the audience narrows to a college or cohort.
  useEffect(() => {
    if (
      (audience === LiveSessionAudience.COLLEGE || audience === LiveSessionAudience.COHORT) &&
      colleges.length === 0
    ) {
      listAdminColleges()
        .then((c) => setColleges(c.filter((x) => x.status !== 'SUSPENDED')))
        .catch(() => setColleges([]));
    }
  }, [audience, colleges.length]);

  // Cohorts belong to a college, so they load once one is picked in COHORT mode.
  useEffect(() => {
    if (audience === LiveSessionAudience.COHORT && collegeId) {
      listAdminCollegeCohorts(collegeId)
        .then(setCohorts)
        .catch(() => setCohorts([]));
    } else {
      setCohorts([]);
    }
  }, [audience, collegeId]);

  // Prefill on open (edit) or reset (create).
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description);
      setMeetingUrl(editing.meetingUrl ?? '');
      setRecordingUrl(editing.recordingUrl ?? '');
      setRegistrationUrl(editing.registrationUrl ?? '');
      setWhen(toLocalInput(editing.scheduledAt));
      setDuration(editing.durationMinutes);
      setAudience(editing.audience);
      setCompanyId(editing.companyId ?? '');
      setCollegeId(editing.collegeId ?? '');
      setCohortId(editing.cohortId ?? '');
      setCoverImageUrl(editing.coverImageUrl ?? '');
      setSpeakerName(editing.speakerName ?? '');
      setSpeakerRole(editing.speakerRole ?? '');
      setSpeakerCompany(editing.speakerCompany ?? '');
      setSpeakerBio(editing.speakerBio ?? '');
      setSpeakerAvatarUrl(editing.speakerAvatarUrl ?? '');
    } else {
      setTitle('');
      setDescription('');
      setMeetingUrl('');
      setRecordingUrl('');
      setRegistrationUrl('');
      setWhen(toLocalInput());
      setDuration(60);
      setAudience(LiveSessionAudience.PLATFORM);
      setCompanyId('');
      setCollegeId('');
      setCohortId('');
      setCoverImageUrl('');
      setSpeakerName('');
      setSpeakerRole('');
      setSpeakerCompany('');
      setSpeakerBio('');
      setSpeakerAvatarUrl('');
      setNotifyOnCreate(false);
    }
  }, [open, editing]);


  const submit = async () => {
    if (title.trim().length < 3) return toast.error('Add a title (min 3 chars).');
    if (!/^https?:\/\//i.test(meetingUrl.trim())) return toast.error('Add a valid http(s) meeting link.');
    if (registrationUrl.trim() && !/^https?:\/\//i.test(registrationUrl.trim()))
      return toast.error('The registration link must start with http(s).');
    if (recordingUrl.trim() && !/^https?:\/\//i.test(recordingUrl.trim()))
      return toast.error('The recording link must be a valid http(s) URL.');
    if (audience === LiveSessionAudience.COMPANY && !companyId) return toast.error('Pick a company.');
    if (audience === LiveSessionAudience.COLLEGE && !collegeId) return toast.error('Pick a college.');
    if (audience === LiveSessionAudience.COHORT && !cohortId) return toast.error('Pick a cohort.');
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        meetingUrl: meetingUrl.trim(),
        recordingUrl: recordingUrl.trim() || null,
        registrationUrl: registrationUrl.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        speakerName: speakerName.trim() || null,
        speakerRole: speakerRole.trim() || null,
        speakerCompany: speakerCompany.trim() || null,
        speakerBio: speakerBio.trim() || null,
        speakerAvatarUrl: speakerAvatarUrl.trim() || null,
        scheduledAt: new Date(when).toISOString(),
        durationMinutes: duration,
        audience,
        companyId: audience === LiveSessionAudience.COMPANY ? companyId : null,
        collegeId: audience === LiveSessionAudience.COLLEGE ? collegeId : null,
        cohortId: audience === LiveSessionAudience.COHORT ? cohortId : null,
      };
      if (editing) await updateLiveSession(editing.id, body);
      else await createLiveSession({ ...body, notifyOnCreate });
      toast.success(
        editing
          ? 'Session updated.'
          : notifyOnCreate
            ? 'Session scheduled - students notified.'
            : 'Session scheduled. Use Notify to tell students when you’re ready.',
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(describeError(err, 'Could not save the session.'));
    } finally {
      setSaving(false);
    }
  };

  const input =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-black text-navy">{editing ? 'Edit session' : 'Schedule a live session'}</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5" /></button>
            </div>

            <div className="space-y-4 p-5">
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Amazon SDE - interview masterclass" className={input} autoFocus />
              </Field>
              <Field label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={3} placeholder="What's this session about?" className={cn(input, 'resize-y')} />
              </Field>

              <Field label="Cover image (optional — shown atop the student card)">
                <ImageUpload value={coverImageUrl} onChange={setCoverImageUrl} purpose="live-session-cover" />
              </Field>

              <Field label="Meeting link (Zoom / Google Meet)">
                <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} maxLength={1000} placeholder="https://zoom.us/j/…  or  https://meet.google.com/…" className={input} />
              </Field>
              <Field label="Recording link (optional - add after the session for playback)">
                <input value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} maxLength={1000} placeholder="https://…/recording  (students can watch this back)" className={input} />
              </Field>
              <Field label="External registration link (optional - leave empty to use the in-app Register button)">
                <input value={registrationUrl} onChange={(e) => setRegistrationUrl(e.target.value)} maxLength={1000} placeholder="https://…/register  (a form or landing page you host)" className={input} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date & time">
                  <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={input} />
                </Field>
                <Field label="Duration (min)">
                  <input type="number" min={5} max={600} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} className={input} />
                </Field>
              </div>

              <Field label="Audience">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudience(LiveSessionAudience.PLATFORM)}
                    className={cn('flex items-center gap-2 rounded-lg border p-3 text-left transition-colors', audience === LiveSessionAudience.PLATFORM ? 'border-orange bg-orange/5 ring-1 ring-orange' : 'border-slate-200 hover:bg-slate-50')}
                  >
                    <Globe2 className="size-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-navy">All students</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudience(LiveSessionAudience.COMPANY)}
                    className={cn('flex items-center gap-2 rounded-lg border p-3 text-left transition-colors', audience === LiveSessionAudience.COMPANY ? 'border-orange bg-orange/5 ring-1 ring-orange' : 'border-slate-200 hover:bg-slate-50')}
                  >
                    <Building2 className="size-4 text-violet-600" />
                    <span className="text-sm font-semibold text-navy">Drive registrants</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudience(LiveSessionAudience.COLLEGE)}
                    className={cn('flex items-center gap-2 rounded-lg border p-3 text-left transition-colors', audience === LiveSessionAudience.COLLEGE ? 'border-orange bg-orange/5 ring-1 ring-orange' : 'border-slate-200 hover:bg-slate-50')}
                  >
                    <GraduationCap className="size-4 text-sky-600" />
                    <span className="text-sm font-semibold text-navy">One college</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudience(LiveSessionAudience.COHORT)}
                    className={cn('flex items-center gap-2 rounded-lg border p-3 text-left transition-colors', audience === LiveSessionAudience.COHORT ? 'border-orange bg-orange/5 ring-1 ring-orange' : 'border-slate-200 hover:bg-slate-50')}
                  >
                    <Users className="size-4 text-amber-600" />
                    <span className="text-sm font-semibold text-navy">One cohort</span>
                  </button>
                </div>
              </Field>

              {/* Say what the audience ACTUALLY is. Registering for a drive is free and
                  self-serve, so this is not a paying-customer boundary - an admin
                  putting a real recruiter in front of it needs to know that first. */}
              {audience === LiveSessionAudience.COMPANY && (
                <Field label="Company - reaches everyone registered for this drive (free, self-serve - not a paid-plan audience)">
                  <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={input}>
                    <option value="">Select a company…</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              )}

              {audience === LiveSessionAudience.COLLEGE && (
                <Field label="College - reaches every active student at this college">
                  <select value={collegeId} onChange={(e) => setCollegeId(e.target.value)} className={input}>
                    <option value="">Select a college…</option>
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              )}

              {audience === LiveSessionAudience.COHORT && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="College">
                    <select
                      value={collegeId}
                      onChange={(e) => {
                        setCollegeId(e.target.value);
                        setCohortId('');
                      }}
                      className={input}
                    >
                      <option value="">Select a college…</option>
                      {colleges.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cohort - reaches this cohort's members">
                    <select
                      value={cohortId}
                      onChange={(e) => setCohortId(e.target.value)}
                      disabled={!collegeId}
                      className={cn(input, 'disabled:opacity-50')}
                    >
                      <option value="">{collegeId ? 'Select a cohort…' : 'Pick a college first'}</option>
                      {cohorts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <UserRound className="size-4 text-sky-600" />
                  <h3 className="text-sm font-bold text-navy">
                    Featured speaker <span className="font-normal text-slate-400">(optional)</span>
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name">
                    <input value={speakerName} onChange={(e) => setSpeakerName(e.target.value)} maxLength={160} placeholder="e.g. Aditi Rao" className={input} />
                  </Field>
                  <Field label="Role">
                    <input value={speakerRole} onChange={(e) => setSpeakerRole(e.target.value)} maxLength={160} placeholder="e.g. Senior SDE" className={input} />
                  </Field>
                </div>
                <Field label="Company">
                  <input value={speakerCompany} onChange={(e) => setSpeakerCompany(e.target.value)} maxLength={160} placeholder="e.g. Google" className={input} />
                </Field>
                <Field label="Short bio">
                  <textarea value={speakerBio} onChange={(e) => setSpeakerBio(e.target.value)} maxLength={2000} rows={2} placeholder="One or two lines about the speaker" className={cn(input, 'resize-y')} />
                </Field>
                <Field label="Photo">
                  <ImageUpload
                    value={speakerAvatarUrl}
                    onChange={setSpeakerAvatarUrl}
                    purpose="speaker-photo"
                    urlPlaceholder="…or paste a headshot URL"
                  />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              {!editing ? (
                <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={notifyOnCreate}
                    onChange={(e) => setNotifyOnCreate(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-orange focus-visible:ring-2 focus-visible:ring-orange/30"
                  />
                  Notify students now
                </label>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-bold text-[#171717] shadow-sm hover:bg-orange/90 disabled:opacity-50">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null} {editing ? 'Save changes' : 'Schedule session'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</label>
      {children}
    </div>
  );
}
