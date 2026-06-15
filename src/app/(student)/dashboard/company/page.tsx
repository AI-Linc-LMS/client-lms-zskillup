import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CompaniesExplorer } from '@/components/company/CompaniesExplorer';
import { listCompanies, listCourses, listTopics } from '@/lib/api/catalog';

export default async function CompaniesPage() {
  // Real catalog counts for the hero stat bar (public reads). If the backend is
  // unreachable we simply omit the bar rather than show fabricated numbers.
  let stats: { companies: number; tracks: number; topics: number } | null = null;
  try {
    const [companies, courses, topics] = await Promise.all([
      listCompanies(),
      listCourses(),
      listTopics(),
    ]);
    stats = { companies: companies.length, tracks: courses.length, topics: topics.length };
  } catch {
    stats = null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Companies' }]} />

      <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-indigo-900 p-8 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
          Catalog · Campus recruitment · Company hubs
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-[40px] sm:leading-tight">
          Choose your <span className="text-orange">target company</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/70">
          Pick a recruiter and follow a guided track — process overview, topic-wise practice from the
          real question bank, and timed mocks pattern-matched to the actual drive.
        </p>

        {stats ? (
          <dl className="mt-7 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10">
            {[
              { label: 'Recruiting companies', value: stats.companies },
              { label: 'Prep tracks', value: stats.tracks },
              { label: 'Practice topics', value: stats.topics },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 px-5 py-4">
                <dd className="text-2xl font-extrabold leading-none">{s.value}</dd>
                <dt className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <CompaniesExplorer />
    </div>
  );
}
