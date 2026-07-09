import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { StudyPlanClient } from '@/components/study/StudyPlanClient';

/**
 * Smart Study Plan — the fixed, AI-generated 90-day placement roadmap. Built once
 * from the student's calibration result, it drip-unlocks one day at a time. The
 * client component owns the calibration gate, generation, today's tasks, the
 * roadmap ladder and per-day drawer.
 */
export default function StudyPlanPage() {
  return (
    <div data-tour="plan:hero" className="w-full">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Study Plan' }]} />
      <StudyPlanClient />
    </div>
  );
}
