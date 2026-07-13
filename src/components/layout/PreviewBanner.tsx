'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { exitStudentPreview } from '@/lib/preview-actions';
import { hasPreviewHint } from '@/lib/session-hints';

/**
 * Sticky banner shown while a super-admin is previewing the student workspace
 * ("view as student"). Makes the impersonation unmistakable and gives a
 * one-click way back to the admin view. Renders nothing when not previewing.
 *
 * Also the janitor for the preview hint cookie: when the admin hard-navigates
 * back to a console while the cookie lingers, the preview is over — clear it
 * so middleware routing and the API client stay honest.
 */
export function PreviewBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const previewUser = useAuthStore((s) => s.previewUser);

  useEffect(() => {
    const onConsole =
      pathname.startsWith('/superadmin') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/tpo');
    if (onConsole && !previewUser && hasPreviewHint()) {
      exitStudentPreview();
    }
  }, [pathname, previewUser]);

  if (!previewUser) return null;

  function returnToAdmin() {
    exitStudentPreview();
    router.push('/superadmin/dashboard');
  }

  return (
    <div className="sticky top-14 z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-orange/30 bg-orange/10 px-4 py-2 text-center sm:px-6">
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy">
        <Eye className="size-3.5 text-orange" aria-hidden="true" />
        Admin preview - viewing the student experience
        {previewUser.name ? <span className="font-normal text-slate-600">as {previewUser.name}</span> : null}
      </span>
      <button
        type="button"
        onClick={returnToAdmin}
        className="rounded-full bg-navy px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-navy/90"
      >
        Return to admin view
      </button>
    </div>
  );
}
