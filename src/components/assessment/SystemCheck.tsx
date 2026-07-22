'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Loader2,
  MonitorCheck,
  Maximize,
  Mic,
  Wifi,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pre-assessment system check (ITEM 29). A compact panel of readiness rows shown
 * in the right column of the Zone-B instructions gate. Each row carries an icon
 * AND text (never colour alone) so the state is legible without colour vision.
 *
 * The camera/mic rows appear only for proctored assessments. On a successful
 * getUserMedia grant the stream is stashed on `window.__assessmentStream` so the
 * proctored runner (useProctoring) reuses it without a second permission prompt.
 */

type Level = 'checking' | 'ok' | 'warn' | 'fail';

interface Row {
  key: string;
  icon: typeof Wifi;
  label: string;
  level: Level;
  detail: string;
}

const LEVEL_META: Record<Exclude<Level, 'checking'>, { chip: string; text: string; Icon: typeof Check }> = {
  ok: { chip: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30', text: 'text-emerald-300', Icon: Check },
  warn: { chip: 'bg-amber-500/15 text-amber-300 ring-amber-400/30', text: 'text-amber-300', Icon: AlertTriangle },
  fail: { chip: 'bg-rose-500/15 text-rose-300 ring-rose-400/30', text: 'text-rose-300', Icon: X },
};

function StatusChip({ level, label }: { level: Level; label: string }) {
  if (level === 'checking') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-white/60 ring-1 ring-inset ring-white/15">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" /> {label}
      </span>
    );
  }
  const meta = LEVEL_META[level];
  const Icon = meta.Icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', meta.chip)}>
      <Icon className="size-3" aria-hidden="true" /> {label}
    </span>
  );
}

export function SystemCheck({ proctored = false }: { proctored?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [online, setOnline] = useState<boolean>(true);
  const [cam, setCam] = useState<Level>(proctored ? 'checking' : 'ok');
  const [mic, setMic] = useState<Level>(proctored ? 'checking' : 'ok');

  // Internet — navigator.onLine plus live online/offline listeners.
  useEffect(() => {
    const sync = () => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  // Camera + mic — one getUserMedia grant covers both rows. Stash the stream so
  // the proctored runner reuses it (no second prompt). Do NOT stop the tracks on
  // unmount: the runner claims this exact stream when the assessment begins.
  useEffect(() => {
    if (!proctored) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = window.__assessmentStream ?? null;
        const stream =
          existing ??
          (await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
            audio: true,
          }));
        if (cancelled) return;
        window.__assessmentStream = stream;
        setCam(stream.getVideoTracks().length > 0 ? 'ok' : 'warn');
        setMic(stream.getAudioTracks().length > 0 ? 'ok' : 'warn');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch {
        if (cancelled) return;
        // Lenient: proctoring continues even if the device is blocked; it is logged.
        setCam('warn');
        setMic('warn');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proctored]);

  const fullscreenOk =
    typeof document !== 'undefined' &&
    (document.fullscreenEnabled || 'requestFullscreen' in document.documentElement);

  const browserOk =
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    typeof window.fetch === 'function' &&
    typeof window.localStorage !== 'undefined' &&
    (!proctored || typeof navigator.mediaDevices?.getUserMedia === 'function');

  const rows: Row[] = [
    ...(proctored
      ? [
          {
            key: 'camera',
            icon: Camera,
            label: 'Webcam',
            level: cam,
            detail:
              cam === 'ok'
                ? 'Camera detected and ready.'
                : cam === 'checking'
                  ? 'Requesting camera access…'
                  : 'Camera blocked — you can continue, but it is logged.',
          },
          {
            key: 'mic',
            icon: Mic,
            label: 'Microphone',
            level: mic,
            detail:
              mic === 'ok'
                ? 'Microphone detected and ready.'
                : mic === 'checking'
                  ? 'Requesting microphone access…'
                  : 'Microphone blocked — you can continue, but it is logged.',
          },
        ]
      : []),
    {
      key: 'internet',
      icon: Wifi,
      label: 'Internet',
      level: online ? 'ok' : 'fail',
      detail: online ? 'You are connected.' : 'You appear to be offline — reconnect before you begin.',
    },
    {
      key: 'fullscreen',
      icon: Maximize,
      label: 'Fullscreen',
      level: fullscreenOk ? 'ok' : 'warn',
      detail: fullscreenOk
        ? 'Fullscreen is supported.'
        : 'Fullscreen is unavailable in this browser.',
    },
    {
      key: 'browser',
      icon: MonitorCheck,
      label: 'Browser',
      level: browserOk ? 'ok' : 'warn',
      detail: browserOk
        ? 'Your browser is compatible.'
        : 'Some features are unsupported — use a recent Chrome, Edge, or Firefox.',
    },
  ];

  const chipLabel = (level: Level) =>
    level === 'ok' ? 'Ready' : level === 'warn' ? 'Check' : level === 'fail' ? 'Failed' : 'Checking';

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">System check</p>

      {proctored ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black">
          <div className="relative aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" />
            {cam !== 'ok' ? (
              <div className="absolute inset-0 grid place-items-center text-center text-[11px] text-white/50">
                {cam === 'checking' ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <span className="px-4">Camera preview unavailable (you can still continue).</span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <ul className="mt-4 space-y-2.5">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li
              key={row.key}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-white/70 ring-1 ring-inset ring-white/10">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{row.label}</span>
                  <StatusChip level={row.level} label={chipLabel(row.level)} />
                </div>
                <p className={cn('mt-0.5 text-[11px] leading-snug', row.level === 'ok' ? 'text-white/50' : LEVEL_META[row.level === 'checking' ? 'warn' : row.level].text)}>
                  {row.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {proctored ? (
        <p className="mt-3 text-[11px] leading-snug text-white/40">
          Grant camera &amp; microphone access before you begin. Monitoring is lenient — anything unusual is
          logged, never auto-submitted.
        </p>
      ) : null}
    </div>
  );
}
