'use client';

import { ClipboardCheck } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { PlacementReadinessReport } from '@/components/tpo/PlacementReadinessReport';
import { getPlatformPlacementReadinessReport } from '@/lib/api/admin-college-analytics';

/**
 * Super Admin: the Placement Readiness Test across the WHOLE platform, in one read.
 *
 * The same report already existed per college — a TPO sees their own, an admin opens
 * one college at a time from the college panel. With 30 colleges, answering "who has
 * not taken it yet" meant thirty reads and thirty CSVs to stitch together. This is
 * that answer once: every active student, attempted or not, filterable on screen and
 * downloadable as a single file.
 *
 * It renders the SAME component the TPO and college views use, with a platform-wide
 * fetcher injected — so the three can never drift into showing different things.
 *
 * Endpoint: GET /api/v1/admin/reports/placement-readiness (SUPER_ADMIN only — an
 * admin is portfolio-scoped, and a platform roster would reach past their colleges).
 */
export default function PlatformPlacementReadinessPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Placement Readiness' },
        ]}
      />
      <ConsoleHero
        icon={ClipboardCheck}
        eyebrow="Super Admin"
        title="Placement Readiness"
        description="Every active student against the Placement Readiness Test — including the ones who have not taken it. Filter on screen, or download the whole thing as one CSV."
      />

      <PlacementReadinessReport loadReport={getPlatformPlacementReadinessReport} />
    </div>
  );
}
