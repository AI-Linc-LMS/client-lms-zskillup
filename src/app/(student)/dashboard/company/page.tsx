import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CompaniesExplorer } from '@/components/company/CompaniesExplorer';

export default function CompaniesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Companies' }]} />

      <section className="mb-8 rounded-2xl bg-gradient-to-br from-navy to-indigo-900 p-8 text-white">
        <h1 className="text-3xl font-bold">Company-wise placement preparation</h1>
        <p className="mt-2 max-w-2xl text-white/80">
          Pattern-matched papers, syllabus breakdowns, and adaptive mocks for the companies hiring on
          your campus. Pick a company to open its prep hub.
        </p>
      </section>

      <CompaniesExplorer />
    </div>
  );
}
