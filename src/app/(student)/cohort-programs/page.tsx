import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Users, Clock, Trophy, Calendar, ChevronRight, Medal } from 'lucide-react';

const activeCohort = {
  name: 'TCS NQT May 2026 Cohort',
  company: 'TCS',
  peers: 247,
  weeksRemaining: 4,
  nextSession: {
    date: 'May 10, 7 PM IST',
    topic: 'Percentage Shortcuts with Priya Menon',
  },
  leaderboard: [
    { rank: 1, name: 'Ananya S.', score: 94, isUser: false },
    { rank: 2, name: 'Rohan M.', score: 91, isUser: false },
    { rank: 3, name: 'Divya K.', score: 89, isUser: false },
    { rank: 47, name: 'You', score: 73, isUser: true },
  ],
  progress: 58,
};

const upcomingCohorts = [
  {
    id: 'infosys-infytq-june',
    name: 'Infosys InfyTQ June Cohort',
    company: 'Infosys',
    startDate: 'June 5, 2026',
    seatsRemaining: 83,
    duration: '6 weeks',
    tag: 'Aptitude + Reasoning',
  },
  {
    id: 'wipro-wilp',
    name: 'Wipro WILP Cohort',
    company: 'Wipro',
    startDate: 'June 12, 2026',
    seatsRemaining: 41,
    duration: '5 weeks',
    tag: 'Technical + Verbal',
  },
  {
    id: 'full-aptitude-bootcamp',
    name: 'Full Aptitude Bootcamp',
    company: 'Multi-company',
    startDate: 'June 20, 2026',
    seatsRemaining: 120,
    duration: '8 weeks',
    tag: 'All-round Prep',
  },
];

const rankMedalColor: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-slate-400',
  3: 'text-amber-600',
};

export default function CohortProgramsPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cohort Programs' },
        ]}
      />

      {/* Page Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Programs
        </p>
        <h1 className="font-bold text-navy text-2xl leading-tight">Cohort Programs</h1>
        <p className="text-sm text-slate-600 mt-1">
          Learn alongside peers, compete, and grow together
        </p>
      </div>

      {/* Active Cohort â€” Featured Card */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Currently Enrolled
        </p>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="bg-navy px-6 py-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700 mb-2">
                  Active
                </span>
                <h2 className="text-xl font-bold text-white">{activeCohort.name}</h2>
                <p className="text-sm text-slate-300 mt-0.5">Company: {activeCohort.company}</p>
              </div>
              <div className="flex gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-[26px] font-extrabold text-white leading-none">
                    {activeCohort.peers}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                    <Users className="size-3" aria-hidden="true" />
                    Peers
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[26px] font-extrabold text-white leading-none">
                    {activeCohort.weeksRemaining}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                    <Clock className="size-3" aria-hidden="true" />
                    Weeks left
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300">Cohort progress</span>
                <span className="text-xs font-semibold text-white">{activeCohort.progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20">
                <div
                  className="h-1.5 rounded-full bg-orange"
                  style={{ width: `${activeCohort.progress}%` }}
                  role="progressbar"
                  aria-valuenow={activeCohort.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Cohort progress"
                />
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Next Live Session */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Next Live Session
              </p>
              <div className="rounded-lg bg-sky-50 border border-sky-200 px-4 py-3 flex items-start gap-3">
                <Calendar className="size-4 text-sky-700 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {activeCohort.nextSession.topic}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{activeCohort.nextSession.date}</p>
                </div>
              </div>
              <button
                type="button"
                className="mt-4 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                Join Live Session
              </button>
            </div>

            {/* Mini Leaderboard */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <Trophy className="size-3" aria-hidden="true" />
                Cohort Leaderboard
              </p>
              <ol className="space-y-2">
                {activeCohort.leaderboard.map((entry, idx) => {
                  const isGap = idx === 3 && entry.rank > 4;
                  return (
                    <li key={entry.rank}>
                      {isGap && (
                        <div className="flex items-center gap-2 py-0.5 px-2">
                          <span className="text-xs text-slate-300">â€¢â€¢â€¢</span>
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                          entry.isUser
                            ? 'bg-sky-50 border border-sky-200'
                            : 'bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span
                          className={`w-5 text-center text-sm font-bold ${
                            rankMedalColor[entry.rank] ?? 'text-slate-400'
                          }`}
                          aria-label={`Rank ${entry.rank}`}
                        >
                          {entry.rank <= 3 ? (
                            <Medal className="size-4 inline" aria-hidden="true" />
                          ) : (
                            `#${entry.rank}`
                          )}
                        </span>
                        <span
                          className={`flex-1 text-sm ${
                            entry.isUser ? 'font-semibold text-navy' : 'text-slate-700'
                          }`}
                        >
                          {entry.name}
                          {entry.isUser && (
                            <span className="ml-1.5 text-xs text-slate-400 font-normal">(you)</span>
                          )}
                        </span>
                        <span className="text-sm font-semibold text-navy">{entry.score}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Browse Cohorts */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Browse Cohorts
        </p>
        <h2 className="font-bold text-navy text-lg mb-4">Upcoming Cohorts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingCohorts.map((cohort) => (
            <div
              key={cohort.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3"
            >
              <div>
                <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700 mb-2">
                  {cohort.tag}
                </span>
                <h3 className="font-bold text-navy text-sm leading-snug">{cohort.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{cohort.company}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Calendar className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>Starts {cohort.startDate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Clock className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>{cohort.duration}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Users className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-navy">{cohort.seatsRemaining}</span> seats
                    remaining
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-2 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
                >
                  Enroll
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-navy transition-colors"
                  aria-label={`View details for ${cohort.name}`}
                >
                  Details
                  <ChevronRight className="size-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}