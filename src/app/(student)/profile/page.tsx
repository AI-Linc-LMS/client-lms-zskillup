'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Check, GraduationCap, Loader2, Mail, Building2, Phone } from 'lucide-react';
import { getMe, updateMe, type ApiMe } from '@/lib/api/me';
import { getMyRegistrations, type ApiRegistration } from '@/lib/api/registrations';
import { ApiRequestError } from '@/lib/api/types';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
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

/** Profile view + edit (assessment lifecycle P1). Students edit the same fields
 *  captured at onboarding, plus see their company-drive registrations. */
export default function ProfilePage() {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [regs, setRegs] = useState<ApiRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // editable fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<number | ''>('');
  const [collegeName, setCollegeName] = useState('');
  const [passoutYear, setPassoutYear] = useState<number | ''>('');
  const [skillsInput, setSkillsInput] = useState('');
  const [roles, setRoles] = useState<string[]>([]);

  // Live profile-completion score across the captured fields.
  const completion = useMemo(() => {
    const fields = [
      fullName,
      phone,
      course,
      String(yearOfStudy || ''),
      collegeName,
      String(passoutYear || ''),
      skillsInput.trim(),
      roles.length ? 'x' : '',
    ];
    const filled = fields.filter((f) => f && f.trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [fullName, phone, course, yearOfStudy, collegeName, passoutYear, skillsInput, roles]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMe(), getMyRegistrations().catch(() => [] as ApiRegistration[])])
      .then(([m, r]) => {
        if (cancelled) return;
        setMe(m);
        setRegs(r);
        setFullName(m.fullName ?? '');
        const p = m.studentProfile;
        setPhone(p?.phone ?? '');
        setCourse(p?.course ?? '');
        setYearOfStudy(p?.yearOfStudy ?? '');
        setCollegeName(p?.collegeName ?? '');
        setPassoutYear(p?.passoutYear ?? '');
        setSkillsInput((p?.skills ?? []).join(', '));
        setRoles(p?.rolesInterested ?? []);
      })
      .catch(() => setErr('Could not load your profile.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleRole = (name: string) =>
    setRoles((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]));

  const save = async () => {
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const updated = await updateMe({
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        course: course.trim() || undefined,
        yearOfStudy: yearOfStudy ? Number(yearOfStudy) : undefined,
        collegeName: collegeName.trim() || undefined,
        passoutYear: passoutYear ? Number(passoutYear) : undefined,
        skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
        rolesInterested: roles,
      });
      setMe(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
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
              {me?.fullName ?? 'Your profile'}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
              <Mail className="size-3.5" /> {me?.email}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {collegeName ? (
                <Chip icon={GraduationCap}>{collegeName}</Chip>
              ) : null}
              {phone ? <Chip icon={Phone}>{phone}</Chip> : null}
              {regs.length ? (
                <Chip icon={Building2}>{regs.length} drive{regs.length === 1 ? '' : 's'}</Chip>
              ) : null}
            </div>
          </div>
          {/* Completion ring */}
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
            <CompletionRing pct={completion} />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Edit form */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Profile details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} />
            </Field>
            <Field label="Course / Degree">
              <input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="B.Tech CSE" className={inputCls} />
            </Field>
            <Field label="Year of study">
              <select
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value ? Number(e.target.value) : '')}
                className={inputCls}
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    {y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : `${y}th`} year
                  </option>
                ))}
              </select>
            </Field>
            <Field label="College">
              <input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Passout year">
              <input
                value={passoutYear}
                onChange={(e) => setPassoutYear(e.target.value ? Number(e.target.value) : '')}
                inputMode="numeric"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Skills (comma-separated)">
              <input
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Java, SQL, React, DSA"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Roles you&apos;re interested in
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((name) => {
                const active = roles.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleRole(name)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                      active
                        ? 'border-orange bg-orange/10 text-orange'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {err ? (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{err}</p>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)] disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save changes'}
            </button>
            {saved ? (
              <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <Check className="size-4" /> Saved
              </span>
            ) : null}
          </div>
        </div>

        {/* My registrations */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-navy">
              <Building2 className="size-4 text-orange" /> My drives
            </h2>
            {regs.length === 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                You haven&apos;t registered for any company drives yet.{' '}
                <Link href="/dashboard/company" className="font-semibold text-orange hover:underline">
                  Browse companies →
                </Link>
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {regs.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/dashboard/company/${r.companySlug}`}
                      className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-2.5 transition-colors hover:bg-slate-50"
                    >
                      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {r.companyLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.companyLogoUrl} alt="" className="max-h-5 max-w-full object-contain" />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">
                            {r.companyName.slice(0, 2).toUpperCase()}
                          </span>
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
    </div>
  );
}

const inputCls =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors placeholder:text-slate-400 focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {children}
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
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
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
            stroke="#ffb877"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - (pct / 100) * circ}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-black tabular-nums text-white">
          {pct}%
        </span>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 sm:text-right">
        Profile
        <br />
        complete
      </span>
    </div>
  );
}
