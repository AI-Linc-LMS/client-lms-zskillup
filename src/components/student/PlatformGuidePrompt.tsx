'use client';

import { useState } from 'react';
import { Compass, MapPin, MousePointerClick, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useGuide } from '@/components/guide/GuideProvider';
import { useGuideSeen } from '@/hooks/useGuideSeen';
import { markGuideSeen } from '@/lib/api/guide';

/**
 * First-login walkthrough prompt. Mounted once in the student layout, it appears
 * before the calibration prompt (which is gated on `hasSeenGuide`) so a brand-new
 * student is oriented across the platform first. "Take the tour" launches the
 * grand tour; "Maybe later" dismisses it (replayable anytime from the ? button).
 */
export function PlatformGuidePrompt() {
  const { loading, seen, isStudent } = useGuideSeen();
  const { start } = useGuide();
  const [dismissed, setDismissed] = useState(false);

  if (loading || seen || !isStudent || dismissed) return null;

  const take = () => {
    setDismissed(true);
    // Mark seen up front so abandoning the tour (closing the tab) doesn't re-prompt
    // next login; also lets the calibration prompt queue behind it. Idempotent.
    markGuideSeen().catch(() => {});
    start();
  };
  const later = () => {
    setDismissed(true);
    markGuideSeen().catch(() => {});
  };

  const facts = [
    { icon: MapPin, label: 'Every module' },
    { icon: MousePointerClick, label: 'Interactive' },
    { icon: Sparkles, label: '~60 seconds' },
  ];

  return (
    <Modal open onClose={later} dismissible>
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717] shadow-[0_10px_24px_-10px_rgba(245,180,0,0.8)]">
          <Compass className="size-7" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-navy">Take a quick tour?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          New here? We&apos;ll show you around — where every module lives and what each one does, with a guided
          walkthrough you can follow in one go. It takes about a minute.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {facts.map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/70"
            >
              <f.icon className="size-3.5 text-[#f5b400]" /> {f.label}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={take}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717] shadow-sm transition hover:brightness-105"
          >
            Take the tour <Compass className="size-4" />
          </button>
          <button
            type="button"
            onClick={later}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Maybe later
          </button>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">You can replay the tour anytime from the “?” button in the top bar.</p>
      </div>
    </Modal>
  );
}
