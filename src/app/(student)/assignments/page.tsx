import { Breadcrumb } from '@/components/layout/Breadcrumb';

const assignments = [
  {
    id: 1,
    title: 'Time Complexity Analysis',
    course: 'Data Structures & Algorithms',
    type: 'Essay',
    dueDate: '2026-06-02',
    status: 'Pending',
    score: null,
  },
  {
    id: 2,
    title: 'Binary Search Tree Implementation',
    course: 'Data Structures & Algorithms',
    type: 'Coding',
    dueDate: '2026-06-04',
    status: 'Pending',
    score: null,
  },
  {
    id: 3,
    title: 'SQL Joins & Aggregations',
    course: 'Database Management',
    type: 'Practice Set',
    dueDate: '2026-05-30',
    status: 'Overdue',
    score: null,
  },
  {
    id: 4,
    title: 'Object-Oriented Principles Quiz',
    course: 'Core Java Programming',
    type: 'MCQ',
    dueDate: '2026-05-28',
    status: 'Graded',
    score: '8.2 / 10',
  },
  {
    id: 5,
    title: 'Network Protocols Overview',
    course: 'Computer Networks',
    type: 'Essay',
    dueDate: '2026-05-25',
    status: 'Graded',
    score: '7.5 / 10',
  },
  {
    id: 6,
    title: 'OS Scheduling Algorithms',
    course: 'Operating Systems',
    type: 'MCQ',
    dueDate: '2026-06-07',
    status: 'Submitted',
    score: null,
  },
  {
    id: 7,
    title: 'React Hooks Deep Dive',
    course: 'Frontend Development',
    type: 'Coding',
    dueDate: '2026-06-08',
    status: 'Pending',
    score: null,
  },
  {
    id: 8,
    title: 'System Design: URL Shortener',
    course: 'System Design Fundamentals',
    type: 'Essay',
    dueDate: '2026-05-20',
    status: 'Graded',
    score: '9.0 / 10',
  },
];

function getDueDateUrgency(dueDateStr: string, status: string): string {
  if (status === 'Graded' || status === 'Submitted') return 'text-slate-400';
  const now = new Date('2026-06-01');
  const due = new Date(dueDateStr);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'text-red-600 font-semibold';
  if (diffDays < 3) return 'text-red-500 font-semibold';
  if (diffDays < 7) return 'text-amber-600 font-medium';
  return 'text-slate-500';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const typeBadgeColors: Record<string, string> = {
  Essay: 'bg-purple-50 text-purple-700 border border-purple-200',
  MCQ: 'bg-sky-50 text-sky-700 border border-sky-200',
  Coding: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Practice Set': 'bg-orange-50 text-orange border border-orange-200',
};

const statusPillColors: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Submitted: 'bg-sky-50 text-sky-700 border border-sky-200',
  Graded: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Overdue: 'bg-red-50 text-red-700 border border-red-200',
};

function getCTA(status: string): { label: string; style: string } {
  if (status === 'Pending' || status === 'Overdue') {
    return {
      label: status === 'Overdue' ? 'Submit Late' : 'Start',
      style:
        'rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity',
    };
  }
  if (status === 'Submitted') {
    return {
      label: 'View Submission',
      style:
        'rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors',
    };
  }
  return {
    label: 'View Result',
    style:
      'rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors',
  };
}

export default function AssignmentsPage() {
  const total = assignments.length;
  const pending = assignments.filter((a) => a.status === 'Pending').length;
  const graded = assignments.filter((a) => a.status === 'Graded').length;

  return (
    <div className="space-y-6 px-6 py-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assignments' },
        ]}
      />

      {/* Page header */}
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-navy text-2xl">Assignments</h1>
        <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-xs font-semibold text-amber-700">
          3 pending
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Total</span>
          <span className="text-sm font-bold text-navy">{total}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">Pending</span>
          <span className="text-sm font-bold text-amber-700">{pending}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500">Graded</span>
          <span className="text-sm font-bold text-emerald-700">{graded}</span>
        </div>
      </div>

      {/* Assignment list */}
      <div className="flex flex-col gap-3">
        {assignments.map((assignment) => {
          const dueDateClass = getDueDateUrgency(assignment.dueDate, assignment.status);
          const cta = getCTA(assignment.status);

          return (
            <article
              key={assignment.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4 flex items-center gap-4"
            >
              {/* Left: title, course, type badge */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-bold text-navy text-sm leading-snug truncate">
                  {assignment.title}
                </p>
                <p className="text-xs text-slate-500 truncate">{assignment.course}</p>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    typeBadgeColors[assignment.type] ?? 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {assignment.type}
                </span>
              </div>

              {/* Middle: due date */}
              <div className="hidden sm:flex flex-col items-center gap-0.5 min-w-[110px]">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Due</span>
                <span className={`text-xs ${dueDateClass}`}>{formatDate(assignment.dueDate)}</span>
              </div>

              {/* Right: score (if graded), status pill, CTA */}
              <div className="flex flex-col items-end gap-2">
                {assignment.score && (
                  <span className="text-xs font-bold text-emerald-600">{assignment.score}</span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    statusPillColors[assignment.status] ?? 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {assignment.status}
                </span>
                <button type="button" className={cta.style}>
                  {cta.label}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}