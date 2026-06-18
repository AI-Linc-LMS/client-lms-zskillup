import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CodingProblemsList } from '@/components/coding/CodingProblemsList';

/**
 * Coding practice — problem catalogue. Each problem opens a Monaco workspace
 * (/coding/[slug]) that runs against the self-hosted Judge0 and awards XP on
 * the first accepted submission.
 */
export default function CodingPage() {
  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Coding' },
        ]}
      />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Practice & Assessment
        </p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Coding</h1>
        <p className="mt-1 text-sm text-slate-500">
          Solve problems in your language of choice. Run against the samples, then submit to grade
          against the full test set and earn XP.
        </p>
      </div>
      <CodingProblemsList />
    </div>
  );
}
