import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  Calculator,
  MessageSquare,
  Briefcase,
  Code2,
  ArrowRight,
} from 'lucide-react';

const categories = [
  {
    title: 'Aptitude Formulas',
    description: 'Shortcuts, tricks, and formula sheets for quantitative aptitude',
    count: 48,
    color: 'bg-orange/10',
    iconColor: 'text-orange',
    borderColor: 'border-orange-200',
    icon: Calculator,
  },
  {
    title: 'Interview Prep',
    description: 'HR questions, behavioral rounds, and communication tips',
    count: 32,
    color: 'bg-navy/10',
    iconColor: 'text-navy',
    borderColor: 'border-blue-200',
    icon: MessageSquare,
  },
  {
    title: 'Placement Process',
    description: 'Company-wise selection process, eligibility, and timelines',
    count: 24,
    color: 'bg-violet-50',
    iconColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    icon: Briefcase,
  },
  {
    title: 'Coding Concepts',
    description: 'Data structures, algorithms, and language fundamentals',
    count: 56,
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    icon: Code2,
  },
];

const popularArticles = [
  {
    title: 'All percentage formula shortcuts',
    category: 'Aptitude Formulas',
    categoryColor: 'bg-orange-50 text-orange border-orange-200',
    readTime: '5 min read',
  },
  {
    title: 'TCS NQT pattern 2026',
    category: 'Placement Process',
    categoryColor: 'bg-violet-50 text-violet-700 border-violet-200',
    readTime: '8 min read',
  },
  {
    title: 'How to crack InfyTQ',
    category: 'Interview Prep',
    categoryColor: 'bg-sky-50 text-sky-700 border-sky-200',
    readTime: '6 min read',
  },
  {
    title: 'Time & Work â€” master formula sheet',
    category: 'Aptitude Formulas',
    categoryColor: 'bg-orange-50 text-orange border-orange-200',
    readTime: '4 min read',
  },
  {
    title: 'Arrays and Linked Lists explained',
    category: 'Coding Concepts',
    categoryColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    readTime: '10 min read',
  },
  {
    title: 'Wipro NLTH eligibility & rounds',
    category: 'Placement Process',
    categoryColor: 'bg-violet-50 text-violet-700 border-violet-200',
    readTime: '5 min read',
  },
];

const recentlyUpdated = [
  {
    title: 'Ratio & Proportion â€” advanced tricks',
    category: 'Aptitude Formulas',
    updatedAt: '30 May 2026',
  },
  {
    title: 'Cognizant GenC Elevate 2026 pattern',
    category: 'Placement Process',
    updatedAt: '28 May 2026',
  },
  {
    title: 'Dynamic Programming â€” beginner guide',
    category: 'Coding Concepts',
    updatedAt: '25 May 2026',
  },
];

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Knowledge Base' },
        ]}
      />

      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-navy">Knowledge Base</h1>
        <p className="text-sm text-slate-600">Guides, formulas, and concept notes</p>
      </div>

      {/* Search bar (static / visual only) */}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <svg
            className="size-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        </span>
        <div
          role="searchbox"
          aria-label="Search articles, formulas, guides"
          aria-readonly="true"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-400 shadow-sm"
        >
          Search articles, formulas, guides...
        </div>
      </div>

      {/* Category grid */}
      <section aria-labelledby="categories-heading">
        <p id="categories-heading" className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Browse by category
        </p>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <article
                key={cat.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className={`mb-4 inline-flex rounded-lg p-2.5 ${cat.color}`}>
                  <Icon className={`size-5 ${cat.iconColor}`} aria-hidden="true" />
                </div>
                <h2 className="mb-1 font-bold text-navy">{cat.title}</h2>
                <p className="mb-3 text-xs text-slate-500 leading-relaxed">{cat.description}</p>
                <span className="text-xs text-slate-400">{cat.count} articles</span>
              </article>
            );
          })}
        </div>
      </section>

      {/* Popular Articles */}
      <section aria-labelledby="popular-heading">
        <p id="popular-heading" className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Popular articles
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularArticles.map((article) => (
            <article
              key={article.title}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="space-y-2">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${article.categoryColor}`}
                >
                  {article.category}
                </span>
                <h3 className="text-sm font-semibold text-navy leading-snug">
                  {article.title}
                </h3>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">{article.readTime}</span>
                <span
                  aria-label={`Read ${article.title}`}
                  className="flex items-center gap-1 text-xs font-medium text-orange"
                >
                  Read
                  <ArrowRight className="size-3" aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Recently Updated */}
      <section aria-labelledby="recent-heading">
        <p id="recent-heading" className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Recently updated
        </p>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {recentlyUpdated.map((article) => (
            <div
              key={article.title}
              className="flex items-center justify-between px-5 py-4"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-navy">{article.title}</p>
                <p className="text-xs text-slate-400">{article.category}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 pl-4">
                <span className="text-xs text-slate-400">{article.updatedAt}</span>
                <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}