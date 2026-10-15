import { TrendingUp } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { PlacementReportScreen } from '@/components/admin/analytics/PlacementReportScreen';

/** ZSkillup overall: funnel, the three placement milestones, demand and losses (PRD §14). */
export default function PlacementReportPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Placement report' },
        ]}
      />
      <ConsoleHero
        icon={TrendingUp}
        eyebrow="Placement"
        title="Placement report"
        description="The platform as a whole. No percentage appears without its denominator, and offer-received, accepted and joined are counted separately — there is deliberately no single “placed” figure to quote."
      />
      <PlacementReportScreen />
    </div>
  );
}
