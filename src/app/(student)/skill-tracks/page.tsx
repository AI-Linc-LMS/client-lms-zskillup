import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Lock, BookOpen, Clock, HelpCircle, CheckCircle } from 'lucide-react';

interface Track {
  id: string;
  name: string;
  company: string;
  slug: string;
  gradient: string;
  accentBg: string;
  weeks: number;
  modules: number;
  questions: number;
  enrolled: boolean;
  progress?: number;
  premium: boolean;
  currentWeek?: number;
}

const tracks: Track[] = [
  {
    id: 'tcs-nqt',
    name: 'TCS NQT Prep Track',
    company: 'TCS',
    slug: 'tcs-nqt',
    gradient: 'from-navy to-[#2563eb]',
    accentBg: 'bg-blue-600',
    weeks: 8,
    modules: 24,
    questions: 480,
    enrolled: true,
    progress: 38,
    premium: false,
    currentWeek: 3,
  },
  {
    id: 'infosys-infytq',
    name: 'Infosys InfyTQ Track',
    company: 'Infosys',
    slug: 'infosys-infytq',
    gradient: 'from-[#065f46] to-[#059669]',
    accentBg: 'bg-emerald-600',
    weeks: 6,
    modules: 18,
    questions: 360,
    enrolled: true,
    progress: 12,
    premium: false,
    currentWeek: 1,
  },
  {
    id: 'wipro-wilp',
    name: 'Wipro WILP Track',
    company: 'Wipro',
    slug: 'wipro-wilp',
    gradient: 'from-[#7c2d12] to-[#ea580c]',
    accentBg: 'bg-orange-600',
    weeks: 7,
    modules: 21,
    questions: 420,
    enrolled: false,
    premium: true,
  },
  {
    id: 'cognizant-genc',
    name: 'Cognizant GenC Track',
    company: 'Cognizant',
    slug: 'cognizant-genc',
    gradient: 'from-[#4c1d95] to-[#7c3aed]',
    accentBg: 'bg-violet-600',
    weeks: 6,
    modules: 20,
    questions: 400,
    enrolled: false,
    premium: true,
  },
  {
    id: 'capgemini-tech',
    name: 'Capgemini Tech Track',
    company: 'Capgemini',
    slug: 'capgemini-tech',
    gradient: 'from-[#1e40af] to-[#0ea5e9]',
    accentBg: 'bg-sky-600',
    weeks: 5,
    modules: 16,
    questions: 320,
    enrolled: false,
    premium: true,
  },
];

const crumbs = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Skill Tracks' },
];

export default function SkillTracksPage() {
  const activeTrack = tracks.find((t) => t.id === 'tcs-nqt')!;

  return (
    <div className="space-y-8">
      <Breadcrumb items={crumbs} />

      {/* Page header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Programs
        </p>
        <h1 className="mt-1 font-bold text-navy text-2xl">Skill Tracks</h1>
        <p className="mt-1 text-sm text-slate-600">
          Structured multi-week journeys to placement readiness
        </p>
      </div>

      {/* Active track banner */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-navy to-[#2563eb] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200 mb-1">
                Currently Enrolled
              </p>
              <h2 className="text-lg font-bold leading-snug">{activeTrack.name}</h2>
              <p className="mt-0.5 text-sm text-blue-100">
                Week {activeTrack.currentWeek} of {activeTrack.weeks} &middot; {activeTrack.progress}% complete
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                <CheckCircle className="size-3.5" aria-hidden="true" />
                Active
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-blue-100 mb-1.5">
              <span>Progress</span>
              <span>{activeTrack.progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/20">
              <div
                className="h-1.5 rounded-full bg-white"
                style={{ width: `${activeTrack.progress}%` }}
                role="progressbar"
                aria-valuenow={activeTrack.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${activeTrack.progress}% complete`}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 text-xs font-medium">
              Next milestone: Complete Percentage module by May 12
            </span>
          </div>
          <a
            href={`/dashboard/skill-tracks/${activeTrack.slug}`}
            className="inline-flex items-center justify-center rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            Continue Track
          </a>
        </div>
      </div>

      {/* Track grid */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
          All Tracks
        </p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TrackCard({ track }: { track: Track }) {
  const isEnrolled = track.enrolled;
  const isLocked = track.premium && !track.enrolled;

  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* Gradient top */}
      <div className={`bg-gradient-to-br ${track.gradient} px-5 py-4 text-white`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-0.5">
              {track.company}
            </p>
            <h3 className="font-bold text-base leading-snug">{track.name}</h3>
          </div>
          {isLocked && (
            <span className="shrink-0 mt-0.5 rounded-full bg-white/20 p-1.5" aria-label="Premium track">
              <Lock className="size-3.5 text-white" aria-hidden="true" />
            </span>
          )}
          {isEnrolled && (
            <span className="shrink-0 mt-0.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
              Enrolled
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 px-5 py-4 gap-4">
        {/* Meta stats */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {track.weeks} weeks
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="size-3.5" aria-hidden="true" />
            {track.modules} modules
          </span>
          <span className="flex items-center gap-1">
            <HelpCircle className="size-3.5" aria-hidden="true" />
            {track.questions} questions
          </span>
        </div>

        {/* Progress bar (enrolled only) */}
        {isEnrolled && typeof track.progress === 'number' && (
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span className="font-medium text-navy">{track.progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-navy"
                style={{ width: `${track.progress}%` }}
                role="progressbar"
                aria-valuenow={track.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${track.progress}% complete`}
              />
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <div>
          {isEnrolled ? (
            <a
              href={`/dashboard/skill-tracks/${track.slug}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              Continue
            </a>
          ) : isLocked ? (
            <a
              href={`/dashboard/skill-tracks/${track.slug}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              <Lock className="size-3.5" aria-hidden="true" />
              Unlock
            </a>
          ) : (
            <a
              href={`/dashboard/skill-tracks/${track.slug}`}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Enroll
            </a>
          )}
        </div>
      </div>
    </article>
  );
}