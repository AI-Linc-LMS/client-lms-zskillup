'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import {
  listColleges,
  saveOnboardingCollege,
  saveOnboardingProfile,
  saveOnboardingTargets,
  type College,
} from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';
import { YEAR_OF_STUDY_OPTIONS } from '@/lib/profile/academic-options';
import {
  INDIA_LOCATIONS,
  INDIA_STATES,
  PASSOUT_YEARS,
  TARGET_COMPANIES,
} from '@/lib/india-locations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/utils';

/**
 * Onboarding wizard - steps 2 (college) & 3 (targets) (STUDENT_JOURNEY_SPEC §1).
 * Dependent dropdowns: state → city → college (college list fetched from the
 * API per state/city, with free-text fallback). On step-3 submit → /dashboard.
 */
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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<2 | 3 | 4>(2);

  // Step 2 state - college
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [passoutYear, setPassoutYear] = useState<number | ''>('');
  const [colleges, setColleges] = useState<College[]>([]);

  // Step 3 state - profile completion
  const [phone, setPhone] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<string>('');
  const [skillsInput, setSkillsInput] = useState('');
  const [roles, setRoles] = useState<string[]>([]);

  // Step 4 state - target companies
  const [selected, setSelected] = useState<{ serviceBased: string[]; productBased: string[] }>({
    serviceBased: [],
    productBased: [],
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cities = useMemo(() => (state ? (INDIA_LOCATIONS[state] ?? []) : []), [state]);

  useEffect(() => {
    if (!state || !city) {
      setColleges([]);
      return;
    }
    let active = true;
    listColleges({ state, city })
      .then((rows) => {
        if (active) setColleges(rows);
      })
      .catch(() => {
        if (active) setColleges([]);
      });
    return () => {
      active = false;
    };
  }, [state, city]);

  const totalSelected = selected.serviceBased.length + selected.productBased.length;

  function toggleCompany(kind: 'serviceBased' | 'productBased', name: string) {
    setSelected((prev) => {
      const list = prev[kind];
      const next = list.includes(name) ? list.filter((c) => c !== name) : [...list, name];
      return { ...prev, [kind]: next };
    });
  }

  async function submitStep2() {
    setError(null);
    if (!state || !city || !collegeName || !passoutYear) {
      setError('Please complete all fields before continuing.');
      return;
    }
    setSubmitting(true);
    try {
      await saveOnboardingCollege({ state, city, collegeName, passoutYear: Number(passoutYear) });
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleRole(name: string) {
    setRoles((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]));
  }

  async function submitProfile() {
    setError(null);
    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setSubmitting(true);
    try {
      await saveOnboardingProfile({
        phone: phone.trim() || undefined,
        course: course.trim() || undefined,
        yearOfStudy: yearOfStudy || undefined,
        skills,
        rolesInterested: roles,
      });
      setStep(4);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitTargets() {
    setError(null);
    if (totalSelected < 1) {
      setError('Select at least one target company so we can personalise your journey.');
      return;
    }
    setSubmitting(true);
    try {
      await saveOnboardingTargets(selected);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-widest">
          <StepBubble num={1} active={false} done />
          <span className="h-px w-5 bg-emerald-300" />
          <StepBubble num={2} active={step === 2} done={step > 2} />
          <span className={cn('h-px w-5', step > 2 ? 'bg-emerald-300' : 'bg-slate-200')} />
          <StepBubble num={3} active={step === 3} done={step > 3} />
          <span className={cn('h-px w-5', step > 3 ? 'bg-emerald-300' : 'bg-slate-200')} />
          <StepBubble num={4} active={step === 4} done={false} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Step {step} of 4
            </p>
            <h1 className="mt-1 text-xl font-bold text-navy">
              {step === 2
                ? 'Tell us about your college'
                : step === 3
                  ? 'Complete your profile'
                  : 'Pick your target companies'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-600">
              {step === 2
                ? 'We use this to surface assessments and benchmarks for your campus.'
                : step === 3
                  ? 'This tailors your dashboard, recommended roles, and skill tracking.'
                  : 'Choose all that interest you - we personalise your roadmap to these.'}
            </p>
          </div>

          {step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setCity('');
                    setCollegeName('');
                  }}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                >
                  <option value="">Select a state</option>
                  {INDIA_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <select
                  id="city"
                  value={city}
                  disabled={!state}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setCollegeName('');
                  }}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                >
                  <option value="">Select a city</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="college">College</Label>
                <input
                  id="college"
                  list="college-options"
                  value={collegeName}
                  disabled={!city}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="Select or type your college"
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors placeholder:text-slate-500 focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                />
                <datalist id="college-options">
                  {colleges.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passout">Passout year</Label>
                <select
                  id="passout"
                  value={passoutYear}
                  onChange={(e) => setPassoutYear(e.target.value ? Number(e.target.value) : '')}
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                >
                  <option value="">Select year</option>
                  {PASSOUT_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
                >
                  {error}
                </p>
              ) : null}

              <Button className="w-full" onClick={submitStep2} disabled={submitting}>
                {submitting ? 'Saving…' : 'Continue'}
              </Button>
            </div>
          ) : step === 3 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    inputMode="tel"
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors placeholder:text-slate-500 focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year">Year of study</Label>
                  <select
                    id="year"
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                  >
                    <option value="">Select</option>
                    {YEAR_OF_STUDY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="course">Course / Degree</Label>
                <input
                  id="course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science"
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors placeholder:text-slate-500 focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="skills">Skills</Label>
                <input
                  id="skills"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Comma-separated, e.g. Java, SQL, React, DSA"
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors placeholder:text-slate-500 focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                />
              </div>

              <div className="space-y-2">
                <Label>Roles you&apos;re interested in</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((name) => {
                    const active = roles.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleRole(name)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                          active
                            ? 'border-orange bg-orange/10 text-orange'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={submitProfile} disabled={submitting}>
                  {submitting ? 'Saving…' : 'Continue'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <CompanyGroup
                title="Service-Based"
                options={TARGET_COMPANIES.serviceBased}
                selected={selected.serviceBased}
                onToggle={(name) => toggleCompany('serviceBased', name)}
              />
              <CompanyGroup
                title="Product-Based"
                options={TARGET_COMPANIES.productBased}
                selected={selected.productBased}
                onToggle={(name) => toggleCompany('productBased', name)}
              />

              {totalSelected > 0 ? (
                <p className="text-xs font-medium text-emerald-600">
                  {totalSelected} compan{totalSelected === 1 ? 'y' : 'ies'} selected
                </p>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={submitTargets} disabled={submitting}>
                  {submitting ? 'Finishing…' : 'Finish onboarding'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StepBubble({ num, active, done }: { num: number; active: boolean; done: boolean }) {
  return (
    <span
      className={cn(
        'grid size-7 place-items-center rounded-full text-xs font-bold transition-colors',
        done
          ? 'bg-emerald-500 text-white'
          : active
            ? 'bg-orange text-[#171717] shadow-sm'
            : 'bg-slate-100 text-slate-500',
      )}
    >
      {done ? <Check className="size-3.5" aria-hidden="true" /> : num}
    </span>
  );
}

function CompanyGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((name) => {
          const active = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(name)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30',
                active
                  ? 'border-orange bg-orange/10 font-semibold text-orange'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
