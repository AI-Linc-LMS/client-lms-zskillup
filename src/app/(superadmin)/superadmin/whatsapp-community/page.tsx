import { Suspense } from 'react';
import { MessageCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { WhatsAppCommunityAdmin } from '@/components/superadmin/WhatsAppCommunityAdmin';

/**
 * Super-admin: WhatsApp Community management. One screen to set/clear each recruiter
 * hub's WhatsApp invite link. Setting a link turns on the "Join WhatsApp Community"
 * CTA on that company's hub for students; removing it turns it off.
 */
export default function SuperAdminWhatsAppCommunityPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'WhatsApp Community' },
        ]}
      />

      <ConsoleHero
        icon={MessageCircle}
        eyebrow="Super Admin"
        title="WhatsApp Community"
        description="Set a WhatsApp invite link per company. Students see a “Join WhatsApp Community” button on that company’s hub while a link is set."
      />

      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />}
      >
        <WhatsAppCommunityAdmin />
      </Suspense>
    </div>
  );
}
