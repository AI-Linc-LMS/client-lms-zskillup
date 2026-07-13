'use client';

import { useEffect, useState } from 'react';
import { Eye, Loader2, Maximize2, Monitor, MonitorX, ShieldCheck } from 'lucide-react';
import { useFocusGuard } from '@/lib/proctoring/useFocusGuard';
import { InterviewRunner } from './InterviewRunner';

/**
 * Wraps the AI mock interview in a lightweight proctored session: a pre-start
 * fullscreen gate, then a live indicator of tab switches + fullscreen exits, and
 * a blocking prompt to return to fullscreen if the candidate leaves it — mirroring
 * the AI-LINC proctored interview. No camera; the interview owns the mic.
 */
export function InterviewProctorGate({ id }: { id: string }) {
  const guard = useFocusGuard();
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  // Only enforce a return-to-fullscreen once we've actually achieved fullscreen —
  // otherwise a browser that blocks/doesn't support it would strand the candidate.
  const [everFullscreen, setEverFullscreen] = useState(false);
  useEffect(() => {
    if (guard.inFullscreen) setEverFullscreen(true);
  }, [guard.inFullscreen]);

  const begin = async () => {
    setStarting(true);
    await guard.start();
    setStarted(true);
    setStarting(false);
  };

  if (!started) {
    // Full-bleed even before start, so the setup screen is focused (no app chrome).
    return (
      <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background p-4">
        <IntroGate onStart={begin} starting={starting} />
      </div>
    );
  }

  return (
    // Full-bleed surface — covers the AppShell sidebar + top bar so the proctored
    // interview owns the whole screen (browser fullscreen removes browser chrome;
    // this removes the app chrome).
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
        <InterviewRunner id={id} />
      </div>

      {/* Live proctor indicator */}
      <div className="fixed right-4 top-4 z-[60] flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/95 px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur">
        <span className="inline-flex items-center gap-1.5 text-emerald-600">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Proctored
        </span>
        <span className="h-3.5 w-px bg-slate-200" />
        <Counter icon={<Eye className="size-3.5" />} label="Tab switches" value={guard.tabSwitches} />
        <Counter icon={<MonitorX className="size-3.5" />} label="FS exits" value={guard.fullscreenExits} />
      </div>

      {/* Transient warning */}
      {guard.lastWarning && (
        <div className="fixed left-1/2 top-16 z-[60] -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 shadow-lg">
          {guard.lastWarning}
        </div>
      )}

      {/* Fullscreen enforcer */}
      {everFullscreen && !guard.inFullscreen && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-600">
              <Monitor className="size-7" />
            </span>
            <h2 className="mt-4 text-lg font-black text-navy">You left fullscreen</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Your interview is proctored. Return to fullscreen to continue - this exit has been logged.
            </p>
            <button
              type="button"
              onClick={guard.enterFullscreen}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105"
            >
              <Maximize2 className="size-4" /> Return to fullscreen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Counter({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const bad = value > 0;
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1 tabular-nums ${bad ? 'text-orange' : 'text-slate-400'}`}
    >
      {icon} {value}
    </span>
  );
}

function IntroGate({ onStart, starting }: { onStart: () => void; starting: boolean }) {
  return (
    <div className="mx-auto max-w-lg py-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-7 text-white">
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-12 size-44 rounded-full bg-orange/20 blur-3xl" />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-orange ring-1 ring-inset ring-white/15">
            <ShieldCheck className="size-3.5" /> Proctored session
          </span>
          <h1 className="relative mt-3 font-display text-2xl font-bold tracking-tight">Before you begin</h1>
          <p className="relative mt-1.5 text-sm leading-relaxed text-white/70">
            Your AI mock interview runs in fullscreen so you can focus - just like a real interview.
          </p>
        </div>
        <div className="space-y-3 p-6">
          <Rule icon={<Maximize2 className="size-4" />} title="Runs in fullscreen" body="We'll switch to fullscreen when you start." />
          <Rule icon={<Eye className="size-4" />} title="Tab switches are tracked" body="Leaving this tab is counted and shown live." />
          <Rule icon={<MonitorX className="size-4" />} title="Fullscreen exits are tracked" body="Exiting fullscreen is logged; you'll be asked to return." />
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105 disabled:opacity-70"
          >
            {starting ? <Loader2 className="size-4 animate-spin" /> : <Maximize2 className="size-4" />}
            Enter fullscreen &amp; start interview
          </button>
          <p className="text-center text-[11px] text-slate-400">A microphone is recommended - the interview is spoken.</p>
        </div>
      </div>
    </div>
  );
}

function Rule({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange/10 text-orange">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-navy">{title}</span>
        <span className="block text-xs text-slate-500">{body}</span>
      </span>
    </div>
  );
}
