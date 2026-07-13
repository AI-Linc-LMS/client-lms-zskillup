'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMe } from '@/lib/api/me';
import { ArrowRight, UserRoundPen } from 'lucide-react';

/**
 * Dashboard nudge for students whose profile isn't fully filled in. Mirrors the
 * 8-field completion score on the Profile page (name, phone, course, year,
 * college, passout year, skills, target roles). It is NOT dismissible — the
 * banner stays on every visit until the profile is actually complete (100%), at
 * which point it disappears on its own. A complete profile powers better
 * recommendations and auto-fills the resume builder.
 */
export function ProfileCompletionBanner() {
  const [pct, setPct] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      getMe()
        .then((me) => {
          if (cancelled) return;
          if (me.role !== 'STUDENT') {
            setPct(null);
            return;
          }
          const p = me.studentProfile;
          const fields: Array<[string, boolean]> = [
            ['name', !!me.fullName?.trim()],
            ['phone', !!p?.phone],
            ['course', !!p?.course],
            ['year of study', !!p?.yearOfStudy],
            ['college', !!p?.collegeName],
            ['passout year', !!p?.passoutYear],
            ['skills', !!p?.skills?.length],
            ['target roles', !!p?.rolesInterested?.length],
          ];
          const filled = fields.filter(([, ok]) => ok).length;
          const percent = Math.round((filled / fields.length) * 100);
          if (percent >= 100) {
            setPct(null); // 100% → hide (also fires when it's completed while mounted)
            return;
          }
          setPct(percent);
          setMissing(fields.filter(([, ok]) => !ok).map(([label]) => label));
        })
        .catch(() => {
          /* not signed in / transient — render nothing */
        });
    };
    check();
    // Re-check whenever the student returns to the dashboard, so editing (or
    // CLEARING) a field on the profile page flips the banner without a hard reload.
    const onFocus = () => check();
    const onVis = () => document.visibilityState === 'visible' && check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  if (pct === null) return null; // hidden until we know the profile is incomplete

  const missingText =
    missing.length <= 3
      ? missing.join(', ')
      : `${missing.slice(0, 3).join(', ')} +${missing.length - 3} more`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-orange/30 bg-gradient-to-br from-orange/[0.12] via-orange/[0.06] to-transparent p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717]">
          <UserRoundPen className="size-5" strokeWidth={2.2} />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-black text-navy">Complete your profile</h3>
          <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[11px] font-bold text-[#f5b400] tabular-nums">
            {pct}% done
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        Add your {missingText} to sharpen recommendations and auto-fill your resume.
      </p>
      {/* progress bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-orange/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Link
        href="/profile"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-navy/90"
      >
        Complete profile <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
