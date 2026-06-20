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
      {/* monitored banner */}
      <div className="fixed left-1/2 top-3 z-[70] -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-[12px] font-semibold text-rose-700 shadow-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-rose-400" />
          </span>
          You are being monitored — proctoring is on
        </div>
      </div>

      {/* self-view tile */}
      <div className="fixed bottom-4 right-4 z-[70] w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] ring-1 ring-black/5">
        <div className="relative aspect-[4/3] bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="size-full -scale-x-100 object-cover"
          />
          {/* LIVE badge */}
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white backdrop-blur">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-80" />
              <span className="relative inline-flex size-1.5 rounded-full bg-rose-500" />
            </span>
            Live
          </span>
          {/* subtle bottom gradient for legibility */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent" />
          {!cameraGranted ? (
            <div className="absolute inset-0 grid place-items-center text-center text-[11px] text-white/55">
              <span>
                <VideoOff className="mx-auto mb-1 size-5" />
                Camera off
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-1 px-2.5 py-2">
          <span className="flex items-center gap-1.5">
            <span className={cameraGranted ? 'text-emerald-400' : 'text-rose-400'}>
              {cameraGranted ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
            </span>
            <span className={micGranted ? 'text-emerald-400' : 'text-rose-400'}>
              {micGranted ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
            </span>
          </span>
          <span className="flex items-center gap-2 text-[10px] font-bold text-white/55">
            <span className="inline-flex items-center gap-0.5" title="Tab switches">
              <Repeat className="size-3" /> {tabSwitches}
            </span>
            <span className="inline-flex items-center gap-0.5" title="Fullscreen exits">
              <Maximize2 className="size-3" /> {fullscreenExits}
            </span>
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
            className="fixed left-1/2 top-14 z-[70] -translate-x-1/2"
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
