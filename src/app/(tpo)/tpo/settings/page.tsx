import { Settings } from 'lucide-react';
import { ModulePlaceholder } from '@/components/tpo/ui';

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      icon={Settings}
      title="Settings"
      blurb="Manage your Placement Office profile, branding and notification preferences."
      points={['College profile & branding', 'Notification preferences', 'Team access']}
      source="College account settings"
    />
  );
}
