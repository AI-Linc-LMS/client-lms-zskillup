'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ClipboardX,
  Maximize2,
  Mic,
  MicOff,
  Monitor,
  Repeat,
  ScanFace,
  Video,
  VideoOff,
} from 'lucide-react';
import type { ProctoringController } from '@/lib/proctoring/useProctoring';
import { fullscreenSupported } from '@/lib/proctoring/fullscreen';

const FACE_TONE: Record<string, string> = {
  NORMAL: 'text-emerald-500',
  WARNING: 'text-amber-500',
  VIOLATION: 'text-rose-500',
  OFF: 'text-slate-300',
};

/**
 * In-assessment proctoring overlay (Phase 4): a live mirrored self-view tile, a
 * "you're being monitored" banner, live tab/fullscreen counters, and warn-only
 * violation toasts. Fixed-position so it floats over the runner.
 */
export function ProctorOverlay({ controller }: { controller: ProctoringController }) {
  const {
    videoRef,
    active,
    cameraGranted,
    micGranted,
    tabSwitches,
    fullscreenExits,
    inFullscreen,
    enterFullscreen,
    windowBlurs,
    clipboardEvents,
    faceStatus,
    faceCount,
    faceViolations,
    lastWarning,
    currentWarnings,
    maxWarnings,
    finalWarning,
  } = controller;

  // The N-warning counter is only shown when auto-submit is enabled for this drive.
  const autoSubmitOn = maxWarnings > 0;
  const reachedLimit = autoSubmitOn && currentWarnings >= maxWarnings;

  // Only enforce return-to-fullscreen once we've actually BEEN in fullscreen, so a
  // browser that blocks/doesn't support it never strands the candidate.
  const [everFullscreen, setEverFullscreen] = useState(false);
  useEffect(() => {
    if (inFullscreen) setEverFullscreen(true);
  }, [inFullscreen]);
  // Never been fullscreen (the start-click request was refused, dismissed, or raced):
  // offer it from a real click. A non-blocking nudge only - nothing is counted and the
  // exam carries on either way.
  const [canFullscreen] = useState(fullscreenSupported);
  // Also read the live document state: start() flips `active` before it records that the
  // Begin/Start click already went fullscreen, which would flash this for a frame.
  const offerFullscreen =
    active &&
    canFullscreen &&
    !everFullscreen &&
    !inFullscreen &&
    !(typeof document !== 'undefined' && document.fullscreenElement);

  // A tab switch and an app/window switch (blur) are both "left the assessment" -
  // show them as ONE number so repeated leaves are visibly counted (they were split
  // across two icons before, which read as "stuck at 1").
  const leftAssessment = tabSwitches + windowBlurs;

  return (
    <>
      {/* Bottom-left proctor bar with the live self-view. Pinned to a corner so it
          never overlaps the section tabs (top) or the question palette (right). */}
      <div className="fixed bottom-4 left-4 z-[80]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-1.5 pr-3.5 shadow-[0_12px_34px_-12px_rgba(15,23,42,0.45)] backdrop-blur">
          {/* live self-view - larger landscape thumbnail */}
          <span className="relative h-[6rem] w-[8rem] shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-slate-200">
            <video ref={videoRef} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" />
            <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-black/55 px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white backdrop-blur">
              <span className="relative flex size-1"><span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-80" /><span className="relative inline-flex size-1 rounded-full bg-rose-500" /></span>
              Live
            </span>
            {!cameraGranted ? (
              <span className="absolute inset-0 grid place-items-center text-white/60"><VideoOff className="size-4" /></span>
            ) : null}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-extrabold text-rose-600">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-80" />
              <span className="relative inline-flex size-1.5 rounded-full bg-rose-500" />
            </span>
            LIVE
          </span>
          <span className="hidden text-[11px] font-semibold text-slate-600 sm:inline">You&apos;re being monitored</span>
          {autoSubmitOn ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ring-1 ${
                reachedLimit
                  ? 'bg-rose-50 text-rose-700 ring-rose-200'
                  : finalWarning
                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                    : 'bg-slate-100 text-slate-600 ring-slate-200'
              }`}
              title="Proctoring warnings — the assessment auto-submits at the limit"
            >
              <AlertTriangle className="size-3" /> Warning {Math.min(currentWarnings, maxWarnings)} / {maxWarnings}
            </span>
          ) : null}
          <span aria-hidden className="h-4 w-px bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <span className={cameraGranted ? 'text-emerald-500' : 'text-rose-500'}>
              {cameraGranted ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
            </span>
            <span className={micGranted ? 'text-emerald-500' : 'text-rose-500'}>
              {micGranted ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
            </span>
          </span>
          <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <span
              className="inline-flex items-center gap-0.5"
              title={`Camera check: ${faceStatus.toLowerCase()} · ${faceCount} face(s) · ${faceViolations} flag(s)`}
            >
              <ScanFace className={`size-3.5 ${FACE_TONE[faceStatus] ?? FACE_TONE.OFF}`} /> {faceViolations}
            </span>
            <span className="inline-flex items-center gap-0.5" title="Left the assessment (tab / window / app switch)"><Repeat className="size-3" /> {leftAssessment}</span>
            <span className="inline-flex items-center gap-0.5" title="Fullscreen exits"><Maximize2 className="size-3" /> {fullscreenExits}</span>
            <span className="inline-flex items-center gap-0.5" title="Copy / paste flags"><ClipboardX className="size-3" /> {clipboardEvents}</span>
          </span>
          {offerFullscreen ? (
            <button
              type="button"
              onClick={enterFullscreen}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
            >
              <Maximize2 className="size-3" aria-hidden="true" /> Enter fullscreen
            </button>
          ) : null}
        </div>
      </div>

      {/* Fullscreen enforcer (#4): after an exit, block the assessment until the
          candidate returns to fullscreen (from a real click, so it isn't rejected).
          This also makes each exit RECOVERABLE, so repeated exits get counted. */}
      {everFullscreen && !inFullscreen ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-900/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-lg">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-600">
              <Monitor className="size-7" />
            </span>
            <h2 className="mt-4 text-lg font-black text-navy">You left fullscreen</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              This assessment is proctored. Return to fullscreen to continue - this exit has been logged.
            </p>
            <button
              type="button"
              onClick={enterFullscreen}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717] shadow-sm transition hover:brightness-105"
            >
              <Maximize2 className="size-4" /> Return to fullscreen
            </button>
          </div>
        </div>
      ) : null}

      {/* Auto-submit in progress: block the assessment the instant the warning limit is
          reached, while the runner finalizes the attempt. */}
      {reachedLimit ? (
        <div className="fixed inset-0 z-[96] grid place-items-center bg-slate-900/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-lg">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="size-7" />
            </span>
            <h2 className="mt-4 text-lg font-black text-navy">Assessment auto-submitted</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              You reached the proctoring warning limit ({maxWarnings} warnings), so your assessment is
              being submitted automatically. Your answers so far are saved.
            </p>
          </div>
        </div>
      ) : null}

      {/* Prominent, hard-to-miss violation warning (top-center) - #7. */}
      <AnimatePresence>
        {lastWarning ? (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="pointer-events-none fixed left-1/2 top-4 z-[95] w-[min(92vw,34rem)] -translate-x-1/2"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-rose-400/50 bg-rose-600 px-4 py-3 text-white shadow-lg ring-1 ring-rose-400/40">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-rose-100">Proctoring alert</p>
                <p className="text-sm font-bold leading-snug">{lastWarning}</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
