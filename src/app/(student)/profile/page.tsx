'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarClock,
  Camera,
  Check,
  Crown,
  GraduationCap,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { getMe, updateMe, type ApiMe } from '@/lib/api/me';
import { ResumeForm } from '@/components/resume/ResumeForm';
import { getResume, listResumes, upsertPrimaryResume } from '@/lib/api/resumes';
import {
  isTemplateKey,
  newId,
  normalizeResume,
  resumeFromProfile,
  type Education,
  type ResumeData,
  type TemplateKey,
} from '@/components/resume/types';
import { notifyProfileUpdated } from '@/lib/profile-events';
import { COURSE_OPTIONS, PASSOUT_YEARS, YEAR_OF_STUDY_OPTIONS, yearOfStudyLabel } from '@/lib/profile/academic-options';
import { useMySubscription } from '@/hooks/useMySubscription';
import { CollegeCombobox } from '@/components/student/CollegeCombobox';
import { getMyRegistrations, type ApiRegistration } from '@/lib/api/registrations';
import { ApiRequestError } from '@/lib/api/types';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MySubscriptionCard } from '@/components/billing/MySubscriptionCard';
import { ActiveSubscriptions } from '@/components/billing/ActiveSubscriptions';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'DevOps Engineer',
  'QA / SDET',
  'Business Analyst',
  'Systems Engineer',
];

type Values = {
  fullName: string;
  phone: string;
  course: string;
  /** Free-form category: "1".."5" (mapped to "Nth year") or "Graduate" /
   *  "Working professional" / "Not applicable"; '' = not set. */
  yearOfStudy: string;
  /** Canonical college id - what actually gets saved (sets auth.users.college_id). */
  collegeId: string;
  /** Legacy free-text name; kept only to show what a pre-dropdown user had saved. */
  collegeName: string;
  passoutYear: number | '';
  skills: string[];
  roles: string[];
  /** Profile photo - hosted URL or a small client-resized JPEG data URL; '' = none. */
  avatarUrl: string;
};

const EMPTY: Values = {
  fullName: '', phone: '', course: '', yearOfStudy: '', collegeId: '', collegeName: '', passoutYear: '', skills: [], roles: [], avatarUrl: '',
};

const COURSES = COURSE_OPTIONS;

/** Keep only digits, preserving an optional leading "+", capped at 15 digits. */
const sanitizePhone = (s: string) => {
  const hasPlus = s.trimStart().startsWith('+');
  return (hasPlus ? '+' : '') + s.replace(/\D/g, '').slice(0, 15);
};
/** A valid phone is 10–15 digits (covers a bare 10-digit number up to +country code). */
const isValidPhone = (s: string) => {
  const d = s.replace(/\D/g, '');
  return d.length >= 10 && d.length <= 15;
};

/** Load an image File, center-crop to a square, downscale to `size`px, and return a
 *  compressed JPEG data URL. Keeps the stored avatar tiny (~15-30KB) so it fits the
 *  text column + leaderboard payload without any object-storage infra. */
function resizeToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no-2d-context'));
      const s = Math.min(img.width, img.height); // square center-crop
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode-failed'));
    };
    img.src = url;
  });
}

const snap = (v: Values) =>
  JSON.stringify({
    ...v,
    fullName: v.fullName.trim(),
    phone: v.phone.trim(),
    course: v.course.trim(),
    collegeName: v.collegeName.trim(),
    skills: [...v.skills].sort(),
    roles: [...v.roles].sort(),
  });

/**
 * Fold the profile's identity + skills INTO the résumé so saving the profile keeps
 * the résumé in sync - the student never re-enters their name/skills, and never
 * even sees it as a "résumé": it just happens. Non-destructive: identity is set
 * from the account, but skills are *unioned* (existing résumé skills, with any
 * levels/categories set in the builder, are preserved; new profile skills appended).
 */
function syncedResume(resume: ResumeData, v: Values, email: string): ResumeData {
  const parts = v.fullName.trim().split(/\s+/).filter(Boolean);
  const seen = new Set(resume.skills.map((s) => s.name.trim().toLowerCase()));
  const skills = [...resume.skills];
  for (const raw of v.skills) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      skills.push({ id: newId(), name });
      seen.add(key);
    }
  }
  return {
    ...resume,
    basicInfo: {
      ...resume.basicInfo,
      // Only let the profile OVERWRITE identity when it actually has a value -
      // never wipe a name/phone the student typed straight into the résumé with an
      // empty (optional) profile field. Mirrors the email guard.
      ...(parts.length ? { firstName: parts[0], lastName: parts.slice(1).join(' ') } : {}),
      email: email || resume.basicInfo.email,
      phone: v.phone.trim() || resume.basicInfo.phone,
    },
    education: foldEducation(resume, v),
    skills,
  };
}

/** Fold the Academic card (degree / college / passout) into the primary education
 *  entry, preserving GPA/location/description and any additional entries. */
function foldEducation(resume: ResumeData, v: Values): Education[] {
  const degree = v.course.trim();
  const institution = v.collegeName.trim();
  const hasAcademic = degree || institution || v.passoutYear;
  if (!hasAcademic && resume.education.length === 0) return resume.education;
  const edu = [...resume.education];
  const primary: Education = edu[0] ?? {
    id: newId(), degree: '', institution: '', location: '', startDate: '', endDate: '', gpa: '', description: '',
  };
  edu[0] = {
    ...primary,
    degree: degree || primary.degree,
    institution: institution || primary.institution,
    endDate: v.passoutYear ? `${v.passoutYear}-06` : primary.endDate,
  };
  return edu;
}

/** Profile view + edit - grouped sections (Personal / Academic / Career / Resume),
 *  skills chip input, completion checklist and ONE sticky unsaved-changes bar that
 *  saves the profile fields AND the résumé together. */
export default function ProfilePage() {
  const { planStatus } = useMySubscription(true);
  const isPremium = planStatus !== 'none';
  const [me, setMe] = useState<ApiMe | null>(null);
  const [regs, setRegs] = useState<ApiRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [v, setV] = useState<Values>(EMPTY);
  const [baseline, setBaseline] = useState<string>(snap(EMPTY));
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }));

  // ── Résumé (the full ATS record, shared with the Resume Builder) ─────────────
  // Lifted onto the page so the ONE "Save profile" bar persists it alongside the
  // profile fields. Backed by the SAME `students.resumes` record the builder uses,
  // seeded from the profile only when the student has none - one source of truth.
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [resumeBase, setResumeBase] = useState<ResumeData | null>(null);
  const [resumeTitle, setResumeTitle] = useState('My Resume');
  const [resumeTemplate, setResumeTemplate] = useState<TemplateKey>('modern');

  // Profile-photo upload: resize client-side to a small JPEG data URL (no object
  // storage needed) then stage it in `v.avatarUrl`; it persists on Save.
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const onPickPhoto = async (file: File | null) => {
    if (!file) return;
    setAvatarErr(null);
    if (!/^image\/(jpe?g|png)$/.test(file.type)) {
      setAvatarErr('Please choose a JPG or PNG image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarErr('That image is too large (max 8MB).');
      return;
    }
    try {
      set('avatarUrl', await resizeToDataUrl(file, 256));
    } catch {
      setAvatarErr("Couldn't process that image - try another.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [m, r, resumeList] = await Promise.all([
          getMe(),
          getMyRegistrations().catch(() => [] as ApiRegistration[]),
          listResumes().catch(() => []),
        ]);
        if (cancelled) return;
        setMe(m);
        setRegs(r);
        const p = m.studentProfile;
        const loaded: Values = {
          fullName: m.fullName ?? '',
          phone: p?.phone ?? '',
          course: p?.course ?? '',
          yearOfStudy: p?.yearOfStudy ?? '',
          collegeId: p?.collegeId ?? '',
          collegeName: p?.collegeName ?? '',
          passoutYear: p?.passoutYear ?? '',
          skills: p?.skills ?? [],
          roles: p?.rolesInterested ?? [],
          avatarUrl: m.avatarUrl ?? '',
        };
        setV(loaded);
        setBaseline(snap(loaded));

        // The profile edits the student's PRIMARY résumé - the first record the
        // builder lists. Load its full blob; if there is none, seed from profile.
        const first = resumeList[0];
        const detail = first ? await getResume(first.id).catch(() => null) : null;
        if (cancelled) return;
        const seeded = detail ? normalizeResume(detail.data) : resumeFromProfile(m);
        setResume(seeded);
        setResumeBase(seeded);
        if (detail) {
          setResumeTitle(detail.title || 'My Resume');
          setResumeTemplate(isTemplateKey(detail.template) ? detail.template : 'modern');
        }
      } catch {
        if (!cancelled) setErr('Could not load your profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 8-field completion checklist (mirrors the dashboard banner).
  const checklist = useMemo(
    () => [
      { label: 'Full name', done: !!v.fullName.trim() },
      { label: 'Phone', done: !!v.phone.trim() && isValidPhone(v.phone) },
      { label: 'Course / degree', done: !!v.course.trim() },
      { label: 'Year of study', done: !!v.yearOfStudy },
      { label: 'College', done: !!v.collegeName.trim() },
      { label: 'Passout year', done: !!v.passoutYear },
      { label: 'Skills', done: v.skills.length > 0 },
      { label: 'Target roles', done: v.roles.length > 0 },
    ],
    [v],
  );
  const completion = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const profileDirty = snap(v) !== baseline;
  const resumeDirty = resume !== null && JSON.stringify(resume) !== JSON.stringify(resumeBase);
  const dirty = profileDirty || resumeDirty;
  // Only flag an INVALID (non-empty) phone - empty is fine until they complete the profile.
  const phoneInvalid = !!v.phone.trim() && !isValidPhone(v.phone);

  const addSkill = (raw: string) => {
    const s = raw.trim();
    if (!s) return;
    setV((p) => (p.skills.some((x) => x.toLowerCase() === s.toLowerCase()) ? p : { ...p, skills: [...p.skills, s] }));
  };
  const toggleRole = (name: string) =>
    setV((p) => ({ ...p, roles: p.roles.includes(name) ? p.roles.filter((r) => r !== name) : [...p.roles, name] }));

  /** Patch a field of the résumé's basicInfo (headline, bio, links) from the profile. */
  const patchBasic = (p: Partial<ResumeData['basicInfo']>) =>
    setResume((r) => (r ? { ...r, basicInfo: { ...r.basicInfo, ...p } } : r));

  /** Patch the primary education entry (GPA / coursework) - the Academic card owns
   *  the degree/college/passout; these enrich the SAME primary résumé entry. */
  const patchEdu0 = (p: Partial<Education>) =>
    setResume((r) => {
      if (!r) return r;
      const edu = [...r.education];
      edu[0] = {
        ...(edu[0] ?? { id: newId(), degree: '', institution: '', location: '', startDate: '', endDate: '', gpa: '', description: '' }),
        ...p,
      };
      return { ...r, education: edu };
    });
  const edu0 = resume?.education?.[0];

  /** Persist the résumé blob via the FREE primary-résumé upsert (never paywalled). */
  const persistResume = async (next: ResumeData) => {
    await upsertPrimaryResume({
      title: resumeTitle.trim() || 'My Resume',
      template: resumeTemplate,
      data: next,
    });
    setResumeBase(next);
  };

  // ONE save: profile fields first, then the résumé (only what actually changed).
  const save = async () => {
    // Never persist a malformed phone number.
    if (phoneInvalid) {
      setErr('Please enter a valid phone number (10–15 digits).');
      return;
    }
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      if (profileDirty) {
        // Send an explicit null (not undefined) for empty fields so cleared values
        // actually persist - undefined is dropped by JSON.stringify, which made the
        // backend skip the field and keep the old value (profile "reverted" on refresh).
        const updated = await updateMe({
          fullName: v.fullName.trim() || null,
          phone: v.phone.trim() || null,
          course: v.course.trim() || null,
          yearOfStudy: v.yearOfStudy || null,
          // The canonical id is the source of truth - the server sets auth.users
          // .college_id from it and denormalises the display name. We ALSO send the
          // name: for the "Add it / Other" free-text flow there is no collegeId, and
          // without the name the chosen college was never persisted, so the College
          // field stayed incomplete forever. (When collegeId IS set the server
          // ignores this and uses the canonical name.)
          collegeId: v.collegeId || null,
          collegeName: v.collegeName.trim() || null,
          passoutYear: v.passoutYear ? Number(v.passoutYear) : null,
          skills: v.skills,
          rolesInterested: v.roles,
          // Send the photo only when it actually changed - avoids re-uploading a
          // ~45KB data URL on every unrelated save. '' clears it back to no photo.
          ...(v.avatarUrl !== (me?.avatarUrl ?? '') ? { avatarUrl: v.avatarUrl } : {}),
        });
        setMe(updated);
        setBaseline(snap(v));
        // Flip the dashboard banner + feature lock gates (server-driven completion)
        // immediately, rather than leaving them stale until the next window focus.
        notifyProfileUpdated();
      }
      // Silently keep the résumé in sync with the profile. Completing the profile
      // is FREE (the primary-résumé upsert is paywall-exempt), so this always runs.
      if (resume) {
        const next = syncedResume(resume, v, me?.email ?? '');
        if (JSON.stringify(next) !== JSON.stringify(resumeBase)) {
          await persistResume(next);
          setResume(next);
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!me) return;
    setErr(null);
    const p = me.studentProfile;
    setV({
      fullName: me.fullName ?? '',
      phone: p?.phone ?? '',
      course: p?.course ?? '',
      yearOfStudy: p?.yearOfStudy ?? '',
      collegeId: p?.collegeId ?? '',
      collegeName: p?.collegeName ?? '',
      passoutYear: p?.passoutYear ?? '',
      skills: p?.skills ?? [],
      roles: p?.rolesInterested ?? [],
      avatarUrl: me.avatarUrl ?? '',
    });
    setResume(resumeBase);
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="w-full pb-24">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]} />

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <section data-tour="profile:hero" className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] p-6 text-white sm:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-1/4 -top-1/2 size-[40vw] rounded-full bg-[#ffc42d]/20 blur-[110px]" />
          <div className="absolute -right-1/4 -bottom-1/2 size-[36vw] rounded-full bg-[#f5b400]/15 blur-[110px]" />
        </div>
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0 self-start sm:self-center">
            <Avatar src={v.avatarUrl || null} name={v.fullName || me?.email || '?'} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Change profile photo"
              className="absolute -bottom-1.5 -right-1.5 grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717] shadow-lg ring-2 ring-[#0d0e13] transition hover:brightness-110 active:scale-95"
            >
              <Camera className="size-4" strokeWidth={2.5} />
            </button>
            {v.avatarUrl ? (
              <button
                type="button"
                onClick={() => {
                  set('avatarUrl', '');
                  setAvatarErr(null);
                }}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 grid size-7 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                void onPickPhoto(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            {avatarErr ? (
              <p className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200 ring-1 ring-inset ring-rose-400/30">
                {avatarErr}
              </p>
            ) : null}
            {isPremium ? (
              <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#171717] shadow-[0_2px_10px_-2px_rgba(245,180,0,0.7)]">
                <Crown className="size-3" strokeWidth={2.75} /> Premium Member
              </span>
            ) : null}
            <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
              {v.fullName || 'Your profile'}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
              <Mail className="size-3.5" /> {me?.email}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {v.collegeName ? <Chip icon={GraduationCap}>{v.collegeName}</Chip> : null}
              {v.course ? <Chip icon={Briefcase}>{v.course}</Chip> : null}
              {v.yearOfStudy ? <Chip icon={CalendarClock}>{yearOfStudyLabel(v.yearOfStudy)}</Chip> : null}
              {v.passoutYear ? <Chip icon={GraduationCap}>Class of {v.passoutYear}</Chip> : null}
              {regs.length ? (
                <Chip icon={Building2}>{regs.length} assessment{regs.length === 1 ? '' : 's'}</Chip>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
            <CompletionRing pct={completion} />
          </div>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
        {/* ── Edit form (grouped) ────────────────────────────────────────── */}
        <div className="space-y-5">
          <SectionCard data-tour="profile:personal" icon={User} title="Personal" subtitle="How we address you and reach out.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" done={!!v.fullName.trim()}>
                <input value={v.fullName} onChange={(e) => set('fullName', e.target.value)} className={inputCls} placeholder="Your name" />
              </Field>
              <Field label="Phone" done={!!v.phone.trim() && isValidPhone(v.phone)}>
                <input
                  value={v.phone}
                  onChange={(e) => set('phone', sanitizePhone(e.target.value))}
                  inputMode="numeric"
                  maxLength={16}
                  className={cn(inputCls, phoneInvalid && 'border-rose-300 focus:border-rose-400 focus:ring-rose-200')}
                  placeholder="10-digit mobile number"
                  aria-invalid={phoneInvalid}
                />
                {phoneInvalid ? (
                  <p className="mt-1 text-xs font-medium text-rose-500">Enter a valid phone number (10–15 digits).</p>
                ) : null}
              </Field>
            </div>
          </SectionCard>

          <SectionCard data-tour="profile:academic" icon={GraduationCap} title="Education" subtitle="Your degree and college — powers your college leaderboard and your resume.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course / degree" done={!!v.course.trim()}>
                <input
                  value={v.course}
                  onChange={(e) => set('course', e.target.value)}
                  placeholder="e.g. B.Tech CSE"
                  list="course-options"
                  className={inputCls}
                  autoComplete="off"
                />
                <datalist id="course-options">
                  {COURSES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Year of study" done={!!v.yearOfStudy}>
                <select value={v.yearOfStudy} onChange={(e) => set('yearOfStudy', e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  {YEAR_OF_STUDY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              {/* Pre-loaded colleges. This must be a PICK, not free text: choosing a
                  college sets the real college_id, which is what the "My College"
                  leaderboard (and cohort scoping) filter on. Typing it never did -
                  which is why that board silently showed national rankings. */}
              <Field label="College" done={!!v.collegeId}>
                <CollegeCombobox
                  collegeId={v.collegeId}
                  collegeName={v.collegeName}
                  onSelect={({ id, name }) => {
                    set('collegeId', id);
                    set('collegeName', name);
                  }}
                />
                {!v.collegeId && v.collegeName ? (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Currently saved as “{v.collegeName}”. Pick it from the list so your
                    college leaderboard works.
                  </p>
                ) : null}
              </Field>
              <Field label="Passout year" done={!!v.passoutYear}>
                <select value={v.passoutYear} onChange={(e) => set('passoutYear', e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                  <option value="">Not applicable</option>
                  {PASSOUT_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </Field>
              <Field label="GPA / CGPA">
                <input value={edu0?.gpa ?? ''} onChange={(e) => patchEdu0({ gpa: e.target.value })} className={inputCls} placeholder="e.g. 8.7/10" />
              </Field>
              <Field label="Location">
                <input value={edu0?.location ?? ''} onChange={(e) => patchEdu0({ location: e.target.value })} className={inputCls} placeholder="e.g. Trichy, India" />
              </Field>
              <div className="space-y-1.5 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Relevant coursework <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></p>
                <textarea
                  value={edu0?.description ?? ''}
                  onChange={(e) => patchEdu0({ description: e.target.value })}
                  rows={2}
                  className={cn(inputCls, 'h-auto py-2 leading-relaxed')}
                  placeholder="Data Structures, DBMS, Operating Systems, Distributed Systems…"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard data-tour="profile:career" icon={Sparkles} title="Career" subtitle="Skills and target roles power your recommendations + resume.">
            <SkillsInput skills={v.skills} onAdd={addSkill} onRemove={(s) => set('skills', v.skills.filter((x) => x !== s))} />
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Target roles</p>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((name) => {
                  const active = v.roles.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleRole(name)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                        active ? 'border-orange bg-orange/10 text-orange' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {active && <Check className="size-3.5" />}
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          {/* ── Professional profile ──────────────────────────────────────────
              The richer profile fields. Framed as a profile - NOT a "résumé": the
              student is simply completing their profile, and the résumé is kept in
              sync underneath (see save()). Completing the profile is FREE; flows
              right after Career so there is no gap. */}
          <div data-tour="profile:pro" className="space-y-5">
            <div className="px-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Professional profile</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Your experience, projects and achievements — the complete picture recruiters see.
              </p>
            </div>

            {resume ? (
              <div className="space-y-5">
                <SectionCard icon={Briefcase} title="Headline & links" subtitle="A one-line title, a short bio, and where to find you online.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Professional title">
                      <input value={resume.basicInfo.professionalTitle} onChange={(e) => patchBasic({ professionalTitle: e.target.value })} className={inputCls} placeholder="e.g. Frontend Engineer" />
                    </Field>
                    <Field label="Location">
                      <input value={resume.basicInfo.location} onChange={(e) => patchBasic({ location: e.target.value })} className={inputCls} placeholder="e.g. Bengaluru, India" />
                    </Field>
                    <div className="space-y-1.5 sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Short bio</p>
                      <textarea
                        value={resume.basicInfo.summary}
                        onChange={(e) => patchBasic({ summary: e.target.value })}
                        rows={3}
                        className={cn(inputCls, 'h-auto py-2 leading-relaxed')}
                        placeholder="2-3 sentences about your strengths and what you're aiming for."
                      />
                    </div>
                    <Field label="GitHub">
                      <input value={resume.basicInfo.github ?? ''} onChange={(e) => patchBasic({ github: e.target.value })} className={inputCls} placeholder="github.com/you" />
                    </Field>
                    <Field label="LinkedIn">
                      <input value={resume.basicInfo.linkedin ?? ''} onChange={(e) => patchBasic({ linkedin: e.target.value })} className={inputCls} placeholder="linkedin.com/in/you" />
                    </Field>
                    <Field label="Portfolio">
                      <input value={resume.basicInfo.portfolio ?? ''} onChange={(e) => patchBasic({ portfolio: e.target.value })} className={inputCls} placeholder="your-site.com" />
                    </Field>
                    <Field label="LeetCode">
                      <input value={resume.basicInfo.leetcode ?? ''} onChange={(e) => patchBasic({ leetcode: e.target.value })} className={inputCls} placeholder="leetcode.com/u/you" />
                    </Field>
                  </div>
                </SectionCard>

                <ResumeForm data={resume} onChange={setResume} omit={['basicInfo', 'skills', 'education']} variant="profile" />

                <div className="flex justify-end px-1">
                  <Link href="/resume-builder" className="text-xs font-semibold text-slate-500 transition-colors hover:text-navy">
                    Turn this into a downloadable resume →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-6">
                <p className="text-sm font-semibold text-rose-600">Could not load your professional details.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Aside ──────────────────────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          {completion < 100 && (
            <div data-tour="profile:completion" className="rounded-3xl border border-orange/25 bg-gradient-to-b from-orange/[0.06] to-white p-5">
              <h2 className="flex items-center justify-between text-sm font-bold text-navy">
                Profile completion
                <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[11px] font-bold tabular-nums text-orange">{completion}%</span>
              </h2>
              <ul className="mt-3 space-y-1.5">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    <span className={cn('grid size-4 shrink-0 place-items-center rounded-full', c.done ? 'bg-emerald-500 text-white' : 'border border-slate-300')}>
                      {c.done && <Check className="size-3" />}
                    </span>
                    <span className={c.done ? 'text-slate-500 line-through' : 'font-medium text-navy'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <MySubscriptionCard />
          <ActiveSubscriptions className="rounded-3xl border border-slate-200 bg-white p-5" />

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-navy">
              <Building2 className="size-4 text-orange" /> My assessments
            </h2>
            {regs.length === 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                You haven&apos;t registered for any company assessments yet.{' '}
                <Link href="/dashboard/company" className="font-semibold text-orange hover:underline">Browse companies →</Link>
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {regs.map((r) => (
                  <li key={r.id}>
                    <Link href={`/dashboard/company/${r.companySlug}`} className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 transition-colors hover:bg-slate-50">
                      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {r.companyLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.companyLogoUrl} alt="" className="max-h-5 max-w-full object-contain" />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600">{r.companyName.slice(0, 2).toUpperCase()}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-navy">{r.companyName}</span>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <BadgeCheck className="size-3" /> Registered
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* ── Sticky save bar (profile + résumé, one action) ───────────────────
          Stays mounted while saving OR while an error is showing, so the spinner
          never blinks out mid-save (profile PATCH resolves before the résumé PATCH)
          and a save failure is always visible with a retry, even once both dirty
          flags have collapsed. */}
      {(dirty || saved || saving || err) && (
        <div className="sticky bottom-4 z-20 mt-6 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 py-2 pl-5 pr-2 shadow-[0_16px_40px_-16px_rgba(11,18,32,0.4)] backdrop-blur">
            {err ? (
              <span className="text-sm font-semibold text-rose-600">{err}</span>
            ) : saving ? (
              <span className="text-sm font-semibold text-slate-600">Saving…</span>
            ) : saved && !dirty ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <Check className="size-4" /> All changes saved
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-600">You have unsaved changes</span>
            )}
            {(dirty || err) && (
              <>
                <button onClick={discard} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-navy disabled:opacity-50">
                  <RotateCcw className="size-3.5" /> Discard
                </button>
                <button
                  onClick={save}
                  disabled={saving || phoneInvalid}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-5 py-2 text-sm font-extrabold text-[#171717] shadow-[0_10px_24px_-10px_rgba(245,180,0,0.5)] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : err ? 'Retry' : 'Save profile'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors placeholder:text-slate-500 focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  'data-tour': dataTour,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  'data-tour'?: string;
}) {
  return (
    <section data-tour={dataTour} className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange/10 text-orange">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-navy">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, done, children }: { label: string; done?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}
        {done && <Check className="size-3 text-emerald-500" />}
      </p>
      {children}
    </div>
  );
}

/** Interactive skills tag input - type + Enter/comma to add, click ✕ to remove. */
function SkillsInput({ skills, onAdd, onRemove }: { skills: string[]; onAdd: (s: string) => void; onRemove: (s: string) => void }) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    if (draft.trim()) onAdd(draft);
    setDraft('');
  };
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Skills
        {skills.length > 0 && <Check className="size-3 text-emerald-500" />}
      </p>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-orange focus-within:ring-2 focus-within:ring-orange/30">
        {skills.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-orange/10 py-1 pl-2.5 pr-1 text-xs font-semibold text-orange">
            {s}
            <button type="button" onClick={() => onRemove(s)} aria-label={`Remove ${s}`} className="grid size-4 place-items-center rounded-full text-orange/70 hover:bg-orange/20 hover:text-orange">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !draft && skills.length) {
              onRemove(skills[skills.length - 1]);
            }
          }}
          onBlur={commit}
          placeholder={skills.length ? 'Add a skill…' : 'e.g. Java, SQL, React, DSA'}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-navy outline-none placeholder:text-slate-500"
        />
        {draft.trim() && (
          <button type="button" onClick={commit} className="grid size-6 place-items-center rounded-full bg-orange text-[#171717]">
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">Press Enter or comma to add each skill.</p>
    </div>
  );
}

/** Profile avatar - uploaded/Google photo (via avatarUrl) with an initials fallback. */
function Avatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]); // a freshly-picked photo must re-attempt
  const initials = name.slice(0, 2).toUpperCase();
  const showImg = src && !failed;
  return (
    <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/10 text-3xl font-extrabold text-white ring-1 ring-inset ring-white/20 backdrop-blur sm:size-28">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

function Chip({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-[14rem] items-center gap-1.5 truncate rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur">
      <Icon className="size-3 shrink-0" /> <span className="truncate">{children}</span>
    </span>
  );
}

/** Animated profile-completion ring. */
function CompletionRing({ pct }: { pct: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative size-[64px]">
        <svg width={64} height={64} viewBox="0 0 64 64" className="-rotate-90">
          <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={6} />
          <circle
            cx={32}
            cy={32}
            r={r}
            fill="none"
            stroke={pct >= 100 ? '#34d399' : '#f5b400'}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - (pct / 100) * circ}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-black tabular-nums text-white">{pct}%</span>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 sm:text-right">
        Profile
        <br />
        complete
      </span>
    </div>
  );
}
