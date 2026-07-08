'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, ClipboardCheck, Clock, Layers, ShieldOff } from 'lucide-react';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import { useGuideSeen } from '@/hooks/useGuideSeen';
import { useGuide } from '@/components/guide/GuideProvider';
import { Modal } from '@/components/ui/Modal';

/**
 * First-login / persistent calibration prompt. Mounted once in the student
 * layout, so it overlays every student page. Shows while the student still needs
 * the calibration; "Give later" snoozes it for the session (they can explore as a
 * free user), and it re-appears every time they land back on the dashboard until
 * they take it — matching the requested behaviour.
 */
export function CalibrationPrompt() {
  const { loading, required, mockTestId } = useCalibrationStatus();
  const { loading: guideLoading, seen: guideSeen } = useGuideSeen();
  const { active: guideActive } = useGuide();
  const router = useRouter();
  const pathname = usePathname();
  const [snoozed, setSnoozed] = useState(false);

  // Returning to the dashboard re-surfaces the prompt (it "remains there").
  useEffect(() => {
    if (pathname === '/dashboard') setSnoozed(false);
  }, [pathname]);

  // Guide-first: hold the calibration prompt until the platform guide has been
  // seen or dismissed (and never while the tour is actively running), so a
  // brand-new student is oriented before being asked — one overlay at a time.
  if (loading || guideLoading || !guideSeen || guideActive || !required || snoozed) return null;

  const start = () => {
    setSnoozed(true);
    router.push(mockTestId ? `/dashboard/quiz?mock=${mockTestId}` : '/dashboard');
  };

  const facts = [
    { icon: Clock, label: '60 minutes' },
    { icon: ShieldOff, label: 'No proctoring' },
    { icon: Layers, label: '4 sections + coding' },
  ];

  return (
    <Modal open onClose={() => setSnoozed(true)} dismissible>
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)]">
          <ClipboardCheck className="size-7" />
        </span>
        <h2 className="mt-4 text-xl font-black tracking-tight text-navy">Find out where you stand</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Take a one-time calibration assessment. We&apos;ll measure your readiness across every section, show which
          companies you&apos;re aligned with, and personalize your whole dashboard. It unlocks practice and assessments.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {facts.map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200/70"
            >
              <f.icon className="size-3.5 text-orange" /> {f.label}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={start}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105"
          >
            Attempt now <ArrowRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setSnoozed(true)}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Give later
          </button>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          You can keep exploring for now — but practice &amp; assessments stay locked until you take it.
        </p>
      </div>
    </Modal>
  );
}
