import Link from 'next/link';
import { LayoutDashboard, Mail } from 'lucide-react';

/**
 * Student invitations moved to the Platform Admin (per-college). TPOs no longer
 * invite students directly; this page points them to the right place.
 */
export default function TpoInvitationsPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f5b400]/10 text-[#f5b400]">
        <Mail className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-extrabold text-navy">Invitations are managed by your admin</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Student onboarding - cohorts and bulk invitations - is handled by the Platform Admin for your
        college. Reach out to them to add students, then track everyone here as they engage.
      </p>
      <Link
        href="/tpo/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
      >
        <LayoutDashboard className="size-4" /> Back to dashboard
      </Link>
    </div>
  );
}
