'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Loader2 } from 'lucide-react';
import { loginWithGoogle, type LoginResult } from '@/lib/api/auth';
import { ApiRequestError } from '@/lib/api/types';

// GIS type shim — full types available via @types/google.accounts if needed
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
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize and render GIS button once the script is ready
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !CLIENT_ID) return;

    window.google?.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async ({ credential }) => {
        setLoading(true);
        try {
          const result = await loginWithGoogle(credential);
          onSuccess(result);
        } catch (err) {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : 'Google sign-in failed. Please try again.';
          onError?.(message);
        } finally {
          setLoading(false);
        }
      },
      cancel_on_tap_outside: true,
    });

    window.google?.accounts.id.renderButton(containerRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      width: containerRef.current.clientWidth || 400,
      text,
      logo_alignment: 'center',
    });
  }, [scriptLoaded, onSuccess, onError, text]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div className="relative w-full">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/80">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        )}
        <div ref={containerRef} className="w-full" aria-label="Sign in with Google" />
      </div>
    </>
  );
}
