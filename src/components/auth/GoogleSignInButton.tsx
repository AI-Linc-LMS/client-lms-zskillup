'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Loader2 } from 'lucide-react';
import { loginWithGoogle, type LoginResult } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';

// GIS type shim - full types available via @types/google.accounts if needed
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              logo_alignment?: 'left' | 'center';
            },
          ) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

interface GoogleSignInButtonProps {
  onSuccess: (result: LoginResult) => void;
  onError?: (message: string) => void;
  /** Show the "continue_with" variant on sign-up pages. Default: "signin_with". */
  text?: 'signin_with' | 'continue_with';
}

export function GoogleSignInButton({ onSuccess, onError, text = 'signin_with' }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false); // GSI script + window.google available
  const [rendered, setRendered] = useState(false); // button actually painted into the DOM
  const [failed, setFailed] = useState(false); // script never became available (blocked/offline)
  const [loading, setLoading] = useState(false); // credential exchange in flight

  // Keep the latest callbacks in refs so the render effect does NOT re-run (and
  // tear down / re-init the GSI button) every time the parent re-renders with a
  // fresh inline `onError`/`onSuccess`.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  // Become "ready" as soon as window.google exists - whether the script loads now
  // OR was already loaded on a previous mount/navigation. next/script's `onLoad`
  // only fires on the FIRST download and never again for the de-duped cached
  // script, which is why the button vanished on every soft navigation. So we also
  // probe window.google directly and poll as a fallback (independent of onLoad).
  useEffect(() => {
    if (!CLIENT_ID || ready) return;
    if (window.google?.accounts?.id) {
      setReady(true);
      return;
    }
    let tries = 0;
    const id = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        setReady(true);
        window.clearInterval(id);
      } else if (++tries > 100) {
        window.clearInterval(id); // ~10s: script blocked/offline
        setFailed(true);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [ready]);

  const renderButton = useCallback(() => {
    const el = containerRef.current;
    if (!el || !CLIENT_ID || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async ({ credential }) => {
        setLoading(true);
        try {
          onSuccessRef.current(await loginWithGoogle(credential));
        } catch (err) {
          onErrorRef.current?.(
            err instanceof ApiRequestError ? err.message : 'Google sign-in failed. Please try again.',
          );
        } finally {
          setLoading(false);
        }
      },
      cancel_on_tap_outside: true,
    });

    el.replaceChildren(); // clear any stale button before (re)rendering
    window.google.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      width: Math.round(el.clientWidth) || 400,
      text,
      logo_alignment: 'center',
    });
    setRendered(el.childElementCount > 0);
    setFailed(false);
  }, [text]);

  // Render (and re-render) the button whenever the script becomes ready.
  useEffect(() => {
    if (ready) renderButton();
  }, [ready, renderButton]);

  // The GSI button is painted at a fixed pixel width; re-render it when the
  // container width changes so it never overflows or stays at a stale/zero size.
  useEffect(() => {
    const el = containerRef.current;
    if (!ready || !el || typeof ResizeObserver === 'undefined') return;
    let last = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w && Math.abs(w - last) > 4) {
        last = w;
        renderButton();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready, renderButton]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        // onReady fires on every mount (incl. the cached script); onLoad on first load.
        onLoad={() => setReady(true)}
        onReady={() => setReady(true)}
      />
      <div className="relative min-h-[44px] w-full">
        {/* Credential exchange overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/80">
            <Loader2 className="size-5 animate-spin text-slate-500" />
          </div>
        )}
        {/* Placeholder keeps the slot from collapsing to blank space until the
            GSI button actually paints. */}
        {!rendered && !failed && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md border border-[var(--color-line)] bg-white">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        )}
        {/* Genuine failure (ad-blocker / offline): don't leave dead space - point
            the user at the email form below. */}
        {failed && (
          <p className="rounded-md border border-[var(--color-line)] bg-white px-3 py-2.5 text-center text-xs text-[var(--color-text-muted)]">
            Google sign-in is unavailable right now - please sign in with email below.
          </p>
        )}
        <div ref={containerRef} className="w-full" aria-label="Sign in with Google" />
      </div>
    </>
  );
}
