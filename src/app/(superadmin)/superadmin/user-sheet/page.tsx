import { Sheet } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { UserSheet } from '@/components/superadmin/user-sheet/UserSheet';

/**
 * Super Admin: the live user sheet. Every user with profile, college, cohort, department,
 * registration, last login and paid status, kept current in near real time and
 * exportable as CSV or Excel.
 *
 * Endpoints (backend AdminUserSheetController, SUPER_ADMIN only):
 *   GET  /api/v1/admin/user-sheet[?since=<cursor>]   - full snapshot or delta
 *   POST /api/v1/admin/user-sheet/exports            - audit of a downloaded file (exact rows)
 *
 * Server Component shell; the live table is a client leaf. Role gating is handled by the
 * (superadmin) route group's middleware and enforced by the endpoint.
 */
export default function UserSheetPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'User Sheet' },
        ]}
      />

      <ConsoleHero
        icon={Sheet}
        eyebrow="Super Admin"
        title="User Sheet"
        description="Every user in one live sheet: new registrations and profile, status, college, cohort and subscription changes appear automatically. Times are IST."
      />

      <UserSheet />
    </div>
  );
}
