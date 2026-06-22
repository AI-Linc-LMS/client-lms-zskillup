'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, Mic, ShieldCheck, X } from 'lucide-react';

type CheckState = 'idle' | 'requesting' | 'ready' | 'denied';

/**
 * Pre-flight device check for a proctored assessment (Phase 4). Requests camera
 * + mic, shows a live preview, and (on success) stashes the stream on
 * window.__assessmentStream so the runner reuses it without a second prompt.
 * Lenient: the student can continue even if the camera is blocked.
 */
export function DeviceCheck({
  title,
  onReady,
  onCancel,
}: {
  title: string;
  onReady: () => void;
  onCancel?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<CheckState>('idle');
  const [hasCam, setHasCam] = useState(false);
  const [hasMic, setHasMic] = useState(false);

  const request = async () => {
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true,
      });
      window.__assessmentStream = stream;
      setHasCam(stream.getVideoTracks().length > 0);
      setHasMic(stream.getAudioTracks().length > 0);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setState('ready');
    } catch {
      setState('denied');
    }
  };

  useEffect(() => {
    void request();
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10 text-navy">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <span className="grid size-12 place-items-center rounded-2xl bg-orange/10 text-orange">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold">Device check</h1>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-semibold text-navy">{title}</span> is proctored. We&apos;ll show
          your camera while you take it. Monitoring is lenient — switching tabs or leaving fullscreen
          is only logged, not blocked.
        </p>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-black">
          <div className="relative aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" />
            {state !== 'ready' ? (
              <div className="absolute inset-0 grid place-items-center text-white/50">
                {state === 'requesting' ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : state === 'denied' ? (
                  <span className="text-center text-sm">
                    Camera blocked. You can still continue (lenient).
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <CheckChip ok={hasCam} icon={Camera} label="Camera" />
          <CheckChip ok={hasMic} icon={Mic} label="Microphone" />
        </div>

        <div className="mt-6 flex gap-3">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          ) : null}
          {state === 'denied' ? (
            <button
              type="button"
              onClick={request}
              className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Retry camera
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReady}
            disabled={state === 'requesting'}
            className="flex-[1.6] rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)] disabled:opacity-60"
          >
            {state === 'ready' ? 'Start proctored assessment' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckChip({
  ok,
  icon: Icon,
  label,
}: {
  ok: boolean;
  icon: typeof Camera;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
      <Icon className="size-3.5" />
      {label}
      {ok ? (
        <Check className="size-3.5 text-emerald-600" />
      ) : (
        <X className="size-3.5 text-rose-600" />
      )}
    </span>
  );
}
