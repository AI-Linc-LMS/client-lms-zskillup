import { Breadcrumb } from '@/components/layout/Breadcrumb';

const topics = [
  { name: 'Percentage Concepts', accuracy: 88 },
  { name: 'Number Series', accuracy: 72 },
  { name: 'Verbal Reasoning', accuracy: 65 },
  { name: 'Logical Puzzles', accuracy: 81 },
  { name: 'Data Interpretation', accuracy: 58 },
  { name: 'Coding Fundamentals', accuracy: 43 },
];

const weakAreas = [
  {
    topic: 'Coding Fundamentals',
    accuracy: 43,
    action: 'Complete the "Intro to Algorithms" module and attempt 2 practice sets.',
  },
  {
    topic: 'Data Interpretation',
    accuracy: 58,
    action: 'Review DI shortcuts, then solve 15 mixed chart questions.',
  },
  {
    topic: 'Verbal Reasoning',
    accuracy: 65,
    action: 'Work through the Verbal Reasoning topic drill â€” focus on analogy and odd-one-out sets.',
  },
];

const recentActivity = [
  { day: 'Mon', date: 'May 26', questions: 24, accuracy: 71, time: '38 min' },
  { day: 'Tue', date: 'May 27', questions: 18, accuracy: 67, time: '29 min' },
  { day: 'Wed', date: 'May 28', questions: 30, accuracy: 80, time: '52 min' },
  { day: 'Thu', date: 'May 29', questions: 12, accuracy: 58, time: '19 min' },
  { day: 'Fri', date: 'May 30', questions: 22, accuracy: 82, time: '41 min' },
  { day: 'Sat', date: 'May 31', questions: 35, accuracy: 76, time: '60 min' },
  { day: 'Sun', date: 'Jun 1', questions: 20, accuracy: 75, time: '33 min' },
];

function barColor(accuracy: number): string {
  if (accuracy > 80) return 'bg-emerald-500';
  if (accuracy >= 60) return 'bg-amber-400';
  return 'bg-red-500';
}

export default function PerformancePage() {
  return (
    <div className="space-y-8 p-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Performance' },
        ]}
      />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">Performance</h1>
        <span className="inline-flex items-center rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white shadow-sm">
          PPS&nbsp;71&nbsp;/&nbsp;100
        </span>
      </div>

      {/* KPI stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'PPS Score', value: '71', sub: 'out of 100' },
          { label: 'Accuracy', value: '78%', sub: 'across all topics' },
          { label: 'Avg Speed', value: '48s', sub: 'per question' },
          { label: 'Practice Streak', value: '14', sub: 'days' },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-[26px] font-extrabold leading-none text-navy">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Topic-wise Accuracy */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Topic-wise Accuracy
        </p>
        <div className="space-y-4">
          {topics.map(({ name, accuracy }) => (
            <div key={name} className="flex items-center gap-3">
              <span className="w-44 shrink-0 text-sm text-slate-600">{name}</span>
              <div className="flex-1 rounded-full bg-slate-100" style={{ height: '10px' }}>
                <div
                  className={`${barColor(accuracy)} h-full rounded-full`}
                  style={{ width: `${accuracy}%` }}
                  role="presentation"
                />
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-semibold text-navy">
                {accuracy}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Weak Areas */}
      <section>
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Weak Areas
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {weakAreas.map(({ topic, accuracy, action }) => (
            <div
              key={topic}
              className="rounded-xl border border-red-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold text-navy">{topic}</p>
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
                  {accuracy}%
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{action}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Recent Activity Summary â€” Last 7 Days
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Day
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Date
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Questions
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Accuracy
                </th>
                <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Time Spent
                </th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map(({ day, date, questions, accuracy, time }) => (
                <tr key={date} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 font-semibold text-navy">{day}</td>
                  <td className="py-3 text-slate-400">{date}</td>
                  <td className="py-3 text-right text-slate-600">{questions}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`font-semibold ${
                        accuracy > 80
                          ? 'text-emerald-600'
                          : accuracy >= 60
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {accuracy}%
                    </span>
                  </td>
                  <td className="py-3 text-right text-slate-400">{time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}