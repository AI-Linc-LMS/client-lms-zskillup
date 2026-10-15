import { GraduationCap } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { AcademicImportScreen } from '@/components/admin/AcademicImportScreen';

/** Importing the academic marks every hard eligibility rule needs (PRD §20). */
export default function AcademicsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Academic marks' },
        ]}
      />
      <ConsoleHero
        icon={GraduationCap}
        eyebrow="Student data"
        title="Academic marks"
        description="Academic eligibility rules return “unknown” for every student without marks. This is how the marks get in — previewed first, with every rejected row named by its line number, and a blank cell left alone rather than cleared."
      />
      <AcademicImportScreen />
    </div>
  );
}
