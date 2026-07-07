'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Globe2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { listAdminCompanies, type AdminCompanyRow } from '@/lib/api/admin';
import {
  createLiveSession,
  updateLiveSession,
  LiveSessionAudience,
  type LiveSessionDto,
} from '@/lib/api/live-sessions';
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
  const [when, setWhen] = useState(toLocalInput());
  const [duration, setDuration] = useState(60);
  const [audience, setAudience] = useState<LiveSessionAudience>(LiveSessionAudience.PLATFORM);
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<AdminCompanyRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listAdminCompanies().then(setCompanies).catch(() => {});
  }, []);

  // Prefill on open (edit) or reset (create).
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description);
      setMeetingUrl(editing.meetingUrl);
      setRecordingUrl(editing.recordingUrl ?? '');
      setWhen(toLocalInput(editing.scheduledAt));
      setDuration(editing.durationMinutes);
      setAudience(editing.audience);
      setCompanyId(editing.companyId ?? '');
    } else {
      setTitle('');
      setDescription('');
      setMeetingUrl('');
      setRecordingUrl('');
      setWhen(toLocalInput());
      setDuration(60);
      setAudience(LiveSessionAudience.PLATFORM);
      setCompanyId('');
    }
  }, [open, editing]);

  const submit = async () => {
    if (title.trim().length < 3) return toast.error('Add a title (min 3 chars).');
    if (!/^https?:\/\//i.test(meetingUrl.trim())) return toast.error('Add a valid http(s) meeting link.');
    if (recordingUrl.trim() && !/^https?:\/\//i.test(recordingUrl.trim()))
      return toast.error('The recording link must be a valid http(s) URL.');
    if (audience === LiveSessionAudience.COMPANY && !companyId) return toast.error('Pick a company.');
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        meetingUrl: meetingUrl.trim(),
        recordingUrl: recordingUrl.trim() || null,
        scheduledAt: new Date(when).toISOString(),
        durationMinutes: duration,
        audience,
        companyId: audience === LiveSessionAudience.COMPANY ? companyId : null,
      };
      if (editing) await updateLiveSession(editing.id, body);
      else await createLiveSession(body);
      toast.success(editing ? 'Session updated.' : 'Session scheduled — students notified.');
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
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="size-5" /></button>
            </div>

            <div className="space-y-4 p-5">
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Amazon SDE — interview masterclass" className={input} autoFocus />
              </Field>
              <Field label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={3} placeholder="What's this session about?" className={cn(input, 'resize-y')} />
              </Field>
              <Field label="Meeting link (Zoom / Google Meet)">
                <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} maxLength={1000} placeholder="https://zoom.us/j/…  or  https://meet.google.com/…" className={input} />
              </Field>
              <Field label="Recording link (optional — add after the session for playback)">
                <input value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} maxLength={1000} placeholder="https://…/recording  (students can watch this back)" className={input} />
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
                    <span className="text-sm font-semibold text-navy">Company</span>
                  </button>
                </div>
              </Field>

              {audience === LiveSessionAudience.COMPANY && (
                <Field label="Company (only its registered students are notified)">
                  <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={input}>
                    <option value="">Select a company…</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange/90 disabled:opacity-50">
                {saving ? <Loader2 className="size-4 animate-spin" /> : null} {editing ? 'Save changes' : 'Schedule & notify'}
              </button>
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
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}
