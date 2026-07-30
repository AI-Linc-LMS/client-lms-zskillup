'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PlayCircle, X } from 'lucide-react';

/**
 * Concept-video overlay for the adaptive/practice flow. Opened from a CTA that
 * sits next to Submit, so a student can revise the concept BEFORE (or after)
 * answering — just-in-time learning, without being forced to answer first.
 *
 * Deliberately answer-safe: it NEVER fetches the attempt-gated question solution
 * (which bundles the worked answer), so opening it before submitting can't leak
 * the answer. It only renders a topic concept video when one is wired
 * (`videoUrl`, an embeddable Vimeo player URL) and otherwise a "coming soon"
 * state. Being a pure overlay, opening/closing it doesn't touch the selected
 * answer, the timer, or the adaptive flow.
 */
export function ConceptVideoModal({
  open,
  onClose,
  videoUrl,
  topicLabel,
}: {
  open: boolean;
  onClose: () => void;
  videoUrl?: string | null;
  topicLabel?: string | null;
}) {
  const reduce = useReducedMotion();

  // Esc-to-close + body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Concept video"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div aria-hidden className="absolute inset-0 bg-navy/60" />

          <motion.div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-navy/5 text-navy">
                  <PlayCircle className="size-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Concept video</p>
                  {topicLabel ? <p className="text-sm font-bold text-navy">{topicLabel}</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
              >
                <X className="size-4" />
              </button>
            </div>

            {videoUrl ? (
              <div className="relative aspect-video w-full bg-navy">
                <iframe
                  src={videoUrl}
                  title="Concept video"
                  className="absolute inset-0 size-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-navy/5 text-navy">
                  <PlayCircle className="size-6" />
                </span>
                <p className="text-base font-bold text-navy">Concept video — coming soon</p>
                <p className="max-w-sm text-sm leading-relaxed text-slate-600">
                  We&apos;re adding short concept videos for each topic. You&apos;ll be able to watch the idea behind this
                  question here — before or after you answer.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
