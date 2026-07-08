import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { RecommendationsHub } from '@/components/student/RecommendationsHub';

export const metadata = {
  title: 'Recommendations · ZSkillup',
  description: 'Personalized courses, companies, sections and topics based on your calibration and practice.',
};

export default function RecommendationsPage() {
  return (
    <div className="space-y-6" data-tour="reco:hub">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Recommendations' }]} />
      <RecommendationsHub />
    </div>
  );
}
