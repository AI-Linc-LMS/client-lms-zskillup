import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { DashboardHero } from '@/components/student/DashboardHero';
import { KpiRow } from '@/components/student/KpiRow';
import { DailyQuest } from '@/components/student/DailyQuest';
import { ContinueLearning } from '@/components/student/ContinueLearning';
import { CourseTable } from '@/components/student/CourseTable';
import { PracticeHub } from '@/components/student/PracticeHub';
import { DashboardRightRail } from '@/components/student/DashboardRightRail';
import { AdaptiveSkillProfile } from '@/components/student/AdaptiveSkillProfile';

/**
 * Student dashboard (frontend/CLAUDE §4 — the canonical reference UI). Server
 * Component: composes mostly-static presentational cards from seeded data
 * (DEMO_TIMELINE). Only genuinely interactive pieces (course-table tabs, Explore
 * menu, avatar) are client leaves.
 */
export default function StudentDashboardPage() {
  return (
    <div>
      <Breadcrumb
        items={[{ label: 'Home', href: '/' }, { label: 'Learning', href: '/my-learning' }, { label: 'Dashboard' }]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <DashboardHero />
          <KpiRow />
          <DailyQuest />
          <ContinueLearning />
          <CourseTable />
          <PracticeHub />
        </div>

        <aside className="space-y-6">
          <AdaptiveSkillProfile />
          <DashboardRightRail />
        </aside>
      </div>
    </div>
  );
}
