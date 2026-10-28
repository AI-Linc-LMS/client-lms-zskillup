import { BarChart3 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { PlacementReportScreen } from '@/components/admin/analytics/PlacementReportScreen';

/**
 * Placement reporting for one college (TPO requirement 2).
 *
 * The platform's own §14 report, unchanged. It needed no `base` because the endpoints
 * it already called now admit a COLLEGE_ADMIN and confine them to their own college
 * server-side — the scope is the caller's ceiling, not a filter the screen passes.
 *
 * That ceiling is new, and it was load-bearing before it existed: the controller
 * computed it and the service ignored it, so a portfolio-scoped admin had been reading
 * platform-wide numbers. A TPO could not have been given this page until that was true.
 *
 * Breakdowns: student, company, cohort, batch (passout year) and drive.
 */
export default function TpoPlacementReportPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Placement report' },
        ]}
      />
      <ConsoleHero
        icon={BarChart3}
        eyebrow="Placement cell"
        title="Placement report"
        description="Your college's funnel, offers and placements — by student, company, cohort, batch or drive."
      />
      <PlacementReportScreen />
    </div>
  );
}
