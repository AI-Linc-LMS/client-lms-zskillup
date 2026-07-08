import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { AiBriefingHero } from '@/components/student/AiBriefingHero';
import { LiveAssessmentBanner } from '@/components/student/LiveAssessmentBanner';
import { ProfileCompletionBanner } from '@/components/student/ProfileCompletionBanner';
import { AuroraStats } from '@/components/student/AuroraStats';
import { TodaysTip } from '@/components/student/TodaysTip';
import { QuickAptitude } from '@/components/student/QuickAptitude';
import { DailyChallenge } from '@/components/student/DailyChallenge';
import { CodingPractice } from '@/components/student/CodingPractice';
import { Challenges } from '@/components/student/Challenges';
import { DailyQuest } from '@/components/student/DailyQuest';
import { DashboardCompanies } from '@/components/student/DashboardCompanies';
import { PracticeHub } from '@/components/student/PracticeHub';
import { DashboardRightRail } from '@/components/student/DashboardRightRail';
import { AdaptiveSkillProfile } from '@/components/student/AdaptiveSkillProfile';
import { SubscriptionValidity } from '@/components/student/SubscriptionValidity';
import { SidebarUpcoming } from '@/components/layout/SidebarUpcoming';
import { ReadinessPanel } from '@/components/student/ReadinessPanel';
import { CalibrationRecommendations } from '@/components/student/CalibrationRecommendations';
import { PerformanceParticipation } from '@/components/student/PerformanceParticipation';
import { CompanyReadiness } from '@/components/student/CompanyReadiness';
import { Reveal } from '@/components/motion/primitives';

/**
 * Student dashboard — redesigned (Aurora). Above the fold is the AI-personalized
 * briefing hero (GET /students/briefing) over the signature aurora backdrop,
 * then live animated XP/level/streak tiles, then the learning sections, each
 * revealing on scroll.
 */
export default function StudentDashboardPage() {
  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]} />

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <AiBriefingHero />
          <ProfileCompletionBanner />
          <LiveAssessmentBanner />
          <AuroraStats />
          <Reveal>
            <CalibrationRecommendations />
          </Reveal>
          <Reveal>
            <ReadinessPanel />
          </Reveal>
          <Reveal>
            <PerformanceParticipation />
          </Reveal>
          <Reveal>
            <DailyQuest />
          </Reveal>
          <Reveal>
            <DashboardCompanies />
          </Reveal>

          {/* Two independent vertical columns (masonry feel) so the activity
              cards read as columns, not one long horizontal stack. */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div className="min-w-0 space-y-6">
              <TodaysTip />
              <Reveal>
                <QuickAptitude />
              </Reveal>
            </div>
            <div className="min-w-0 space-y-6">
              <Reveal>
                <DailyChallenge />
              </Reveal>
              <Reveal>
                <CodingPractice />
              </Reveal>
            </div>
          </div>

          <Reveal>
            <Challenges />
          </Reveal>
          <Reveal>
            <PracticeHub />
          </Reveal>
        </div>

        <aside className="min-w-0 space-y-6">
          <Reveal delay={0.03}>
            <SubscriptionValidity />
          </Reveal>
          <Reveal delay={0.05}>
            <AdaptiveSkillProfile />
          </Reveal>
          <Reveal delay={0.08}>
            <SidebarUpcoming />
          </Reveal>
          <Reveal delay={0.1}>
            <CompanyReadiness />
          </Reveal>
          <Reveal delay={0.15}>
            <DashboardRightRail />
          </Reveal>
        </aside>
      </div>
    </div>
  );
}
