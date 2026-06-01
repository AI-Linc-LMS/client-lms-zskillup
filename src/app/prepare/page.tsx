import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { PrepareCatalog, PrepareHero } from '@/components/prepare/PrepareCatalog';

/** Prepare catalog (demo). Tracks across categories with search + filters. */
export default function PreparePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Prepare' }]} />
      <div className="space-y-8">
        <PrepareHero />
        <PrepareCatalog />
      </div>
    </div>
  );
}
