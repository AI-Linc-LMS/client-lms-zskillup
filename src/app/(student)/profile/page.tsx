'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Check,
  GraduationCap,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { getMe, updateMe, type ApiMe } from '@/lib/api/me';
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
  yearOfStudy: number | '';
  collegeName: string;
  passoutYear: number | '';
  skills: string[];
  roles: string[];
};

const EMPTY: Values = {
  fullName: '', phone: '', course: '', yearOfStudy: '', collegeName: '', passoutYear: '', skills: [], roles: [],
};

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

/** Profile view + edit — grouped sections, skills chip input, completion
 *  checklist and a sticky unsaved-changes bar. */
export default function ProfilePage() {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [regs, setRegs] = useState<ApiRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [v, setV] = useState<Values>(EMPTY);
  const [baseline, setBaseline] = useState<string>(snap(EMPTY));
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((p) => ({ ...p, [k]: val }));

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMe(), getMyRegistrations().catch(() => [] as ApiRegistration[])])
      .then(([m, r]) => {
        if (cancelled) return;
        setMe(m);
        setRegs(r);
        const p = m.studentProfile;
        const loaded: Values = {
          fullName: m.fullName ?? '',
          phone: p?.phone ?? '',
          course: p?.course ?? '',
          yearOfStudy: p?.yearOfStudy ?? '',
          collegeName: p?.collegeName ?? '',
          passoutYear: p?.passoutYear ?? '',
          skills: p?.skills ?? [],
          roles: p?.rolesInterested ?? [],
        };
        setV(loaded);
        setBaseline(snap(loaded));
      })
      .catch(() => setErr('Could not load your profile.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // 8-field completion checklist (mirrors the dashboard banner).
  const checklist = useMemo(
    () => [
      { label: 'Full name', done: !!v.fullName.trim() },
      { label: 'Phone', done: !!v.phone.trim() },
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
  const dirty = snap(v) !== baseline;

  const addSkill = (raw: string) => {
    const s = raw.trim();
    if (!s) return;
    setV((p) => (p.skills.some((x) => x.toLowerCase() === s.toLowerCase()) ? p : { ...p, skills: [...p.skills, s] }));
  };
  const toggleRole = (name: string) =>
    setV((p) => ({ ...p, roles: p.roles.includes(name) ? p.roles.filter((r) => r !== name) : [...p.roles, name] }));

  const save = async () => {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const updated = await updateMe({
        fullName: v.fullName.trim() || undefined,
        phone: v.phone.trim() || undefined,
        course: v.course.trim() || undefined,
        yearOfStudy: v.yearOfStudy ? Number(v.yearOfStudy) : undefined,
        collegeName: v.collegeName.trim() || undefined,
        passoutYear: v.passoutYear ? Number(v.passoutYear) : undefined,
        skills: v.skills,
        rolesInterested: v.roles,
      });
      setMe(updated);
      setBaseline(snap(v));
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
    const p = me.studentProfile;
    setV({
      fullName: me.fullName ?? '',
      phone: p?.phone ?? '',
      course: p?.course ?? '',
      yearOfStudy: p?.yearOfStudy ?? '',
      collegeName: p?.collegeName ?? '',
      passoutYear: p?.passoutYear ?? '',
      skills: p?.skills ?? [],
      roles: p?.rolesInterested ?? [],
    });
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="w-full pb-24">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]} />

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 text-white shadow-[0_24px_60px_-30px_rgba(11,18,32,0.85)] sm:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-1/4 -top-1/2 size-[40vw] rounded-full bg-[#f37021]/20 blur-[110px]" />
          <div className="absolute -right-1/4 -bottom-1/2 size-[36vw] rounded-full bg-[#2563eb]/20 blur-[110px]" />
        </div>
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar src={me?.avatarUrl ?? null} name={me?.fullName ?? me?.email ?? '?'} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
              {v.fullName || 'Your profile'}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
              <Mail className="size-3.5" /> {me?.email}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {v.collegeName ? <Chip icon={GraduationCap}>{v.collegeName}</Chip> : null}
              {v.course ? <Chip icon={Briefcase}>{v.course}</Chip> : null}
              {regs.length ? (
                <Chip icon={Building2}>{regs.length} drive{regs.length === 1 ? '' : 's'}</Chip>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
            <CompletionRing pct={completion} />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* ── Edit form (grouped) ────────────────────────────────────────── */}
        <div className="space-y-5">
          <SectionCard icon={User} title="Personal" subtitle="How we address you and reach out.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" done={!!v.fullName.trim()}>
                <input value={v.fullName} onChange={(e) => set('fullName', e.target.value)} className={inputCls} placeholder="Your name" />
              </Field>
              <Field label="Phone" done={!!v.phone.trim()}>
                <input value={v.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" className={inputCls} placeholder="+91 …" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={GraduationCap} title="Academic" subtitle="Your college and where you are in your degree.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course / degree" done={!!v.course.trim()}>
                <input value={v.course} onChange={(e) => set('course', e.target.value)} placeholder="B.Tech CSE" className={inputCls} />
              </Field>
              <Field label="Year of study" done={!!v.yearOfStudy}>
                <select value={v.yearOfStudy} onChange={(e) => set('yearOfStudy', e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                  <option value="">Select</option>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : `${y}th`} year</option>
                  ))}
                </select>
              </Field>
              <Field label="College" done={!!v.collegeName.trim()}>
                <input value={v.collegeName} onChange={(e) => set('collegeName', e.target.value)} className={inputCls} placeholder="Your college" />
              </Field>
              <Field label="Passout year" done={!!v.passoutYear}>
                <select value={v.passoutYear} onChange={(e) => set('passoutYear', e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                  <option value="">Select</option>
                  {Array.from({ length: 7 }, (_, i) => 2024 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={Sparkles} title="Career" subtitle="Skills and target roles power your recommendations + resume.">
            <SkillsInput skills={v.skills} onAdd={addSkill} onRemove={(s) => set('skills', v.skills.filter((x) => x !== s))} />
            <div className="mt-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Target roles</p>
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
        </div>

        {/* ── Aside ──────────────────────────────────────────────────────── */}
        <aside className="space-y-4">
          {completion < 100 && (
            <div className="rounded-3xl border border-orange/25 bg-gradient-to-b from-orange/[0.06] to-white p-5 shadow-sm">
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
                    <span className={c.done ? 'text-slate-400 line-through' : 'font-medium text-navy'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <MySubscriptionCard />
          <ActiveSubscriptions className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" />

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-navy">
              <Building2 className="size-4 text-orange" /> My drives
            </h2>
            {regs.length === 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                You haven&apos;t registered for any company drives yet.{' '}
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
                          <span className="text-[10px] font-bold text-slate-500">{r.companyName.slice(0, 2).toUpperCase()}</span>
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

      {/* ── Sticky save bar ──────────────────────────────────────────────── */}
      {(dirty || saved) && (
        <div className="sticky bottom-4 z-20 mt-6 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 py-2 pl-5 pr-2 shadow-[0_16px_40px_-16px_rgba(11,18,32,0.4)] backdrop-blur">
            {err ? (
              <span className="text-sm font-semibold text-rose-600">{err}</span>
            ) : saved && !dirty ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <Check className="size-4" /> All changes saved
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-600">You have unsaved changes</span>
            )}
            {dirty && (
              <>
                <button onClick={discard} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-navy disabled:opacity-50">
                  <RotateCcw className="size-3.5" /> Discard
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2 text-sm font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save changes'}
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
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors placeholder:text-slate-400 focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange/10 text-orange">
          <Icon className="size-[18px]" />
        </span>
        <div>
          <h2 className="text-sm font-black text-navy">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, done, children }: { label: string; done?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
        {done && <Check className="size-3 text-emerald-500" />}
      </p>
      {children}
    </div>
  );
}

/** Interactive skills tag input — type + Enter/comma to add, click ✕ to remove. */
function SkillsInput({ skills, onAdd, onRemove }: { skills: string[]; onAdd: (s: string) => void; onRemove: (s: string) => void }) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    if (draft.trim()) onAdd(draft);
    setDraft('');
  };
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-navy outline-none placeholder:text-slate-400"
        />
        {draft.trim() && (
          <button type="button" onClick={commit} className="grid size-6 place-items-center rounded-full bg-orange text-white">
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">Press Enter or comma to add each skill.</p>
    </div>
  );
}

/** Profile avatar — Google photo (via avatarUrl) with an initials fallback. */
function Avatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();
  const showImg = src && !failed;
  return (
    <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/10 text-2xl font-extrabold text-white ring-1 ring-inset ring-white/20 backdrop-blur">
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
            stroke={pct >= 100 ? '#34d399' : '#ffb877'}
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
