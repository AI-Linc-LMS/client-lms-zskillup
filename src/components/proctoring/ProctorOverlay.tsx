'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ClipboardX,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Repeat,
  ScanFace,
  Video,
  VideoOff,
} from 'lucide-react';
import type { ProctoringController } from '@/lib/proctoring/useProctoring';

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
    cameraGranted,
    micGranted,
    tabSwitches,
    fullscreenExits,
    windowBlurs,
    clipboardEvents,
    faceStatus,
    faceCount,
    faceViolations,
    lastWarning,
  } = controller;

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
            <span className="inline-flex items-center gap-0.5" title="Tab switches"><Repeat className="size-3" /> {tabSwitches}</span>
            <span className="inline-flex items-center gap-0.5" title="Fullscreen exits"><Maximize2 className="size-3" /> {fullscreenExits}</span>
            <span className="inline-flex items-center gap-0.5" title="Left the window / minimized"><Minimize2 className="size-3" /> {windowBlurs}</span>
            <span className="inline-flex items-center gap-0.5" title="Copy / paste flags"><ClipboardX className="size-3" /> {clipboardEvents}</span>
          </span>
        </div>
      </div>

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
