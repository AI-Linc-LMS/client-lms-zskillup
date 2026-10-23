import { Briefcase } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { TpoPlacementScreen } from '@/components/tpo/TpoPlacementScreen';

export default function TpoPlacementPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Placement cell', href: '/tpo/dashboard' },
          { label: 'Placement' },
        ]}
      />
      <ConsoleHero
        icon={Briefcase}
        eyebrow="Your college"
        title="Placement"
        description="Every drive open to your college, and how your own students are doing in it."
      />
      <TpoPlacementScreen />
    </div>
  );
}
