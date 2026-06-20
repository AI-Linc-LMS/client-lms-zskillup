'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Maximize2, Mic, MicOff, Repeat, Video, VideoOff } from 'lucide-react';
import type { ProctoringController } from '@/lib/proctoring/useProctoring';

/**
 * In-assessment proctoring overlay (Phase 4): a live mirrored self-view tile, a
 * "you're being monitored" banner, live tab/fullscreen counters, and warn-only
 * violation toasts. Fixed-position so it floats over the runner.
 */
export function ProctorOverlay({ controller }: { controller: ProctoringController }) {
  const { videoRef, cameraGranted, micGranted, tabSwitches, fullscreenExits, lastWarning } =
    controller;

  return (
    <>
      {/* Top-center proctor bar with the live self-view (NTA-style). */}
      <div className="fixed left-1/2 top-[3.75rem] z-[80] -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-1.5 pr-3.5 shadow-[0_12px_34px_-12px_rgba(15,23,42,0.45)] backdrop-blur">
          {/* live self-view — larger landscape thumbnail */}
          <span className="relative h-[3.25rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-slate-200">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
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
          <span className="hidden text-[11px] font-semibold text-slate-500 sm:inline">You&apos;re being monitored</span>
          <span aria-hidden className="h-4 w-px bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <span className={cameraGranted ? 'text-emerald-500' : 'text-rose-500'}>
              {cameraGranted ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
            </span>
            <span className={micGranted ? 'text-emerald-500' : 'text-rose-500'}>
              {micGranted ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
            </span>
          </span>
          <span className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <span className="inline-flex items-center gap-0.5" title="Tab switches"><Repeat className="size-3" /> {tabSwitches}</span>
            <span className="inline-flex items-center gap-0.5" title="Fullscreen exits"><Maximize2 className="size-3" /> {fullscreenExits}</span>
          </span>
        </div>
      </div>

      {/* warn-only toast */}
      <AnimatePresence>
        {lastWarning ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed left-1/2 top-[6.5rem] z-[80] -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-[12px] font-medium text-amber-700 shadow-sm">
              <AlertTriangle className="size-4 shrink-0" />
              {lastWarning}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
