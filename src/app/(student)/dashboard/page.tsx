import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { AiBriefingHero } from '@/components/student/AiBriefingHero';
import { AuroraStats } from '@/components/student/AuroraStats';
import { TodaysTip } from '@/components/student/TodaysTip';
import { QuickAptitude } from '@/components/student/QuickAptitude';
import { DailyChallenge } from '@/components/student/DailyChallenge';
import { CodingPractice } from '@/components/student/CodingPractice';
import { Challenges } from '@/components/student/Challenges';
import { DailyQuest } from '@/components/student/DailyQuest';
import { ContinueLearning } from '@/components/student/ContinueLearning';
import { CourseTable } from '@/components/student/CourseTable';
import { PracticeHub } from '@/components/student/PracticeHub';
import { DashboardRightRail } from '@/components/student/DashboardRightRail';
import { AdaptiveSkillProfile } from '@/components/student/AdaptiveSkillProfile';
import { ReadinessPanel } from '@/components/student/ReadinessPanel';
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
      <Breadcrumb
        items={[{ label: 'Home', href: '/' }, { label: 'Learning', href: '/my-learning' }, { label: 'Dashboard' }]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <AiBriefingHero />
          <AuroraStats />
          <Reveal>
            <ReadinessPanel />
          </Reveal>
          <TodaysTip />
          <Reveal>
            <DailyChallenge />
          </Reveal>
          <Reveal>
            <DailyQuest />
          </Reveal>
          <Reveal>
            <QuickAptitude />
          </Reveal>
          <Reveal>
            <CodingPractice />
          </Reveal>
          <Reveal>
            <Challenges />
          </Reveal>
          <Reveal>
            <ContinueLearning />
          </Reveal>
          <Reveal>
            <CourseTable />
          </Reveal>
          <Reveal>
            <PracticeHub />
          </Reveal>
        </div>

        <aside className="space-y-6">
          <Reveal delay={0.05}>
            <AdaptiveSkillProfile />
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
