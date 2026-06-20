'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Mic, MicOff, Video, VideoOff } from 'lucide-react';
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
          You are being monitored — AI proctoring is on
        </div>
      </div>

      {/* self-view tile */}
      <div className="fixed bottom-4 right-4 z-[70] w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
        <div className="relative aspect-[4/3] bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="size-full -scale-x-100 object-cover"
          />
          {!cameraGranted ? (
            <div className="absolute inset-0 grid place-items-center text-center text-[11px] text-white/60">
              <span>
                <VideoOff className="mx-auto mb-1 size-5" />
                Camera off
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold text-slate-500">
          <span className="flex items-center gap-1">
            {cameraGranted ? (
              <Video className="size-3 text-emerald-600" />
            ) : (
              <VideoOff className="size-3 text-rose-600" />
            )}
            {micGranted ? (
              <Mic className="size-3 text-emerald-600" />
            ) : (
              <MicOff className="size-3 text-rose-600" />
            )}
          </span>
          <span className="flex items-center gap-2">
            <span title="Tab switches">⇄ {tabSwitches}</span>
            <span title="Fullscreen exits">⤢ {fullscreenExits}</span>
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
