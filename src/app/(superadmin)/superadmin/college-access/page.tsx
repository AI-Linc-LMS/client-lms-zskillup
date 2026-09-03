import { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { AdminCollegeAccess } from '@/components/superadmin/AdminCollegeAccess';

/**
 * Super-admin: Admin ↔ college portfolio (TPO Panel View, true 3-tier hierarchy).
 * Assigns each platform ADMIN a set of colleges; a scoped admin then sees only those
 * colleges across the console (college list + every TPO-Panel analytics/cohort route).
 * An admin with NO assignments keeps all-colleges access, so nothing changes until a
 * super-admin starts assigning.
 *
 * Endpoint surface (backend AdminAccessController, SUPER_ADMIN only):
 *   GET  /api/v1/admin/college-access            - every ADMIN + their scoped colleges
 *   PUT  /api/v1/admin/college-access/:adminId   - replace an admin's college set
 *
 * Server Component shell; the interactive list is a client leaf. Role gating is
 * handled by the (superadmin) route group's middleware.
 */
export default function AdminCollegeAccessPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super-admin', href: '/superadmin/dashboard' },
          { label: 'College Access' },
        ]}
      />

      <ConsoleHero
        icon={ShieldCheck}
        eyebrow="Super Admin"
        title="College Access"
        description={
          <>
            Scope a platform admin to a subset of colleges. A scoped admin sees only
            those colleges&rsquo; dashboards, rosters and reports across the console. An
            admin with no colleges assigned keeps full access to every college.
          </>
        }
      />

      <Suspense fallback={null}>
        <AdminCollegeAccess />
      </Suspense>
    </div>
  );
}
