import { Users } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { DuplicateStudentsScreen } from '@/components/admin/jobs/DuplicateStudentsScreen';

/** Accounts that look like the same person — detection only (PRD §18.12). */
export default function DuplicateStudentsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Students', href: '/admin/students' },
          { label: 'Duplicates' },
        ]}
      />
      <ConsoleHero
        icon={Users}
        eyebrow="Data quality"
        title="Suspected duplicate accounts"
        description="Grouped by the signal that matched them, strongest first. Detection only: merging decides whose attempts, entitlements and offers survive, so it goes through data governance rather than a button here."
      />
      <DuplicateStudentsScreen />
    </div>
  );
}
