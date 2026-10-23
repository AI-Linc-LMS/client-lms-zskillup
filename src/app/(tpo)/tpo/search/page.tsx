import { Search } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { ApplicationSearchScreen } from '@/components/admin/jobs/ApplicationSearchScreen';

/**
 * The same search a platform admin gets, confined to this college by the SERVER.
 *
 * The permission matrix gives a TPO both the company and the drive filter. The API
 * already allowed COLLEGE_ADMIN and scoped it to the token's college; there was simply
 * no page, so the capability existed and was unreachable.
 *
 * `basePath` points student links at the TPO's own student record rather than the
 * admin placement report, which a TPO cannot open.
 */
export default function TpoSearchPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Student search' },
        ]}
      />
      <ConsoleHero
        icon={Search}
        eyebrow="Your college, every drive"
        title="Student search"
        description="Who applied to a company, who is in a round, who holds an offer. Your students only."
      />
      <ApplicationSearchScreen basePath="/tpo" />
    </div>
  );
}
