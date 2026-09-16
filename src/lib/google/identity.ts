/**
 * Google Identity Services (GIS) - the ONE script the app already loads for "Sign in with
 * Google" (`google.accounts.id`). The same script also carries the OAuth 2.0 token client
 * (`google.accounts.oauth2`), which the phone fetch uses to ask for read access to the
 * user's Google phone numbers.
 *
 * Token hygiene: the access token is handed straight to the caller, which sends it to the
 * backend (POST /me/phone/google) and lets it go out of scope. Nothing here stores, caches
 * or logs it, and the backend never persists it either.
 */

/** The GIS client script (shared with GoogleSignInButton). */
export const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/** Read-only access to the phone numbers on the user's Google profile (People API). */
export const GOOGLE_PHONE_SCOPE = 'https://www.googleapis.com/auth/user.phonenumbers.read';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/** How long a consent popup may stay unanswered before the request is given up. */
const CONSENT_TIMEOUT_MS = 3 * 60 * 1000;
const SCRIPT_TIMEOUT_MS = 10 * 1000;

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClientError {
  type: 'popup_failed_to_open' | 'popup_closed' | 'unknown';
  message?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (override?: { prompt?: string }) => void;
}

// GIS type shim - full types available via @types/google.accounts if needed.
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
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: GoogleTokenClientError) => void;
            login_hint?: string;
            prompt?: string;
          }) => GoogleTokenClient;
          hasGrantedAllScopes: (response: GoogleTokenResponse, scope: string, ...scopes: string[]) => boolean;
        };
      };
    };
  }
}

/** Why a Google consent request produced no token. */
export type GoogleConsentFailure =
  | 'not_configured' // no NEXT_PUBLIC_GOOGLE_CLIENT_ID in this build
  | 'unavailable' // the GIS script could not load (offline / blocked) or Google errored
  | 'popup_blocked' // the browser blocked the consent popup
  | 'cancelled' // the user closed the popup or declined
  | 'scope_denied' // consent given, but the phone-number permission was unticked
  | 'timeout'; // the popup was left unanswered

export class GoogleConsentError extends Error {
  readonly reason: GoogleConsentFailure;

  constructor(reason: GoogleConsentFailure) {
    super(`Google consent failed: ${reason}`);
    this.name = 'GoogleConsentError';
    this.reason = reason;
  }
}

let scriptPromise: Promise<boolean> | null = null;

/**
 * Load the GIS script once (reusing a tag another component already added) and resolve
 * true when the OAuth token client is ready. Never rejects; a failure clears the cache so
 * the next call retries.
 */
export function loadGoogleIdentity(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    let el = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`);
    const created = !el;
    const started = Date.now();

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearInterval(poll);
      if (!ok) {
        scriptPromise = null;
        if (created) el?.remove();
      }
      resolve(ok);
    };

    // Poll as well as listen: a tag that finished loading before we got here never fires
    // `load` again.
    const poll = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) finish(true);
      else if (Date.now() - started > SCRIPT_TIMEOUT_MS) finish(false);
    }, 100);

    if (!el) {
      el = document.createElement('script');
      el.src = GIS_SCRIPT_SRC;
      el.async = true;
      document.head.appendChild(el);
    }
    el.addEventListener('load', () => {
      if (window.google?.accounts?.oauth2) finish(true);
    });
    el.addEventListener('error', () => finish(false));
  });
  return scriptPromise;
}

/**
 * Ask Google for a short-lived access token that can read the user's phone numbers.
 *
 * Call it straight from a click handler: when the script is already loaded (preload it
 * with loadGoogleIdentity on mount) the consent popup opens in the same task as the click,
 * which is what keeps popup blockers quiet. Rejects with a GoogleConsentError.
 */
export async function requestGooglePhoneAccessToken(opts: { loginHint?: string | null } = {}): Promise<string> {
  if (!CLIENT_ID) throw new GoogleConsentError('not_configured');
  const oauth2 =
    window.google?.accounts?.oauth2 ?? ((await loadGoogleIdentity()) ? window.google?.accounts?.oauth2 : undefined);
  if (!oauth2) throw new GoogleConsentError('unavailable');

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      fn();
    };
    const timer = window.setTimeout(
      () => settle(() => reject(new GoogleConsentError('timeout'))),
      CONSENT_TIMEOUT_MS,
    );

    try {
      const client = oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: GOOGLE_PHONE_SCOPE,
        ...(opts.loginHint ? { login_hint: opts.loginHint } : {}),
        callback: (response) => {
          if (response.error || !response.access_token) {
            const reason: GoogleConsentFailure = response.error === 'access_denied' ? 'cancelled' : 'unavailable';
            settle(() => reject(new GoogleConsentError(reason)));
          } else if (!oauth2.hasGrantedAllScopes(response, GOOGLE_PHONE_SCOPE)) {
            settle(() => reject(new GoogleConsentError('scope_denied')));
          } else {
            const token = response.access_token;
            settle(() => resolve(token));
          }
        },
        error_callback: (error) => {
          const reason: GoogleConsentFailure =
            error.type === 'popup_closed' ? 'cancelled' : error.type === 'popup_failed_to_open' ? 'popup_blocked' : 'unavailable';
          settle(() => reject(new GoogleConsentError(reason)));
        },
      });
      client.requestAccessToken();
    } catch {
      settle(() => reject(new GoogleConsentError('unavailable')));
    }
  });
}
