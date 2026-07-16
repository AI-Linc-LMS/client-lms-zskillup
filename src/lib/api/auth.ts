import { _rearmApiClient, apiClient } from './client';
import { authToken } from '@/store/auth';
import type {
  AuthForgotPasswordDto,
  AuthLoginDto,
  AuthRegisterDto,
  AuthResetPasswordDto,
  AuthResetPasswordOtpDto,
  AuthVerifyEmailDto,
  OnboardingCollegeDto,
  OnboardingProfileDto,
  OnboardingTargetsDto,
} from '@/shared';

/**
 * Per-domain API module (FRONTEND_STANDARDS §4). Components call these typed
 * functions, not the client directly. Backend payload types will be generated
 * from OpenAPI (Block 4 contract) — these local shapes mirror that contract
 * until the generator is wired into CI.
 *
 * Every credential-establishing endpoint passes `auth: 'login'` so a 401
 * surfaces as "bad credentials" instead of triggering the silent refresh +
 * /login redirect cycle (which used to nuke the form's error-state component
 * — the silent-login-failure bug from the QA audit).
 */

export interface AuthUser {
  id: string;
  name: string | null;
  role: 'STUDENT' | 'COLLEGE_ADMIN' | 'ADMIN' | 'SUPER_ADMIN';
  isOnboarded: boolean;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export async function register(dto: AuthRegisterDto): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>('/api/v1/auth/register', dto, {
    auth: 'login',
  });
  return res.data;
}

export async function verifyEmail(dto: AuthVerifyEmailDto): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>('/api/v1/auth/verify-email', dto, {
    auth: 'login',
  });
  return res.data;
}

export async function resendOtp(email: string): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(
    '/api/v1/auth/resend-otp',
    { email },
    { auth: 'login' },
  );
  return res.data;
}

export async function login(dto: AuthLoginDto): Promise<LoginResult> {
  const res = await apiClient.post<LoginResult>('/api/v1/auth/login', dto, { auth: 'login' });
  authToken.set(res.data.accessToken);
  // Re-arm the API client circuit-breaker after a fresh successful login.
  _rearmApiClient();
  // Non-sensitive hints for middleware redirects (UX only — server is authority).
  document.cookie = `role=${res.data.user.role}; path=/; samesite=lax`;
  document.cookie = `onboarded=${res.data.user.isOnboarded ? '1' : '0'}; path=/; samesite=lax`;
  return res.data;
}

export async function loginWithGoogle(idToken: string): Promise<LoginResult> {
  const res = await apiClient.post<LoginResult>('/api/v1/auth/google', { idToken }, { auth: 'login' });
  authToken.set(res.data.accessToken);
  _rearmApiClient();
  document.cookie = `role=${res.data.user.role}; path=/; samesite=lax`;
  document.cookie = `onboarded=${res.data.user.isOnboarded ? '1' : '0'}; path=/; samesite=lax`;
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    // Call the backend directly (cross-origin, credentials included) so the
    // browser sends the API-domain refresh cookie and the server can revoke the
    // session + clear it. A same-origin Next proxy can't read that cookie when
    // the frontend and API are on different domains.
    await apiClient.post('/api/v1/auth/logout', undefined, { auth: 'login' });
  } catch {
    // Even if the network call fails, clear local state below.
  } finally {
    authToken.clear(); // also drops any active "view as student" preview token
    document.cookie = 'role=; path=/; max-age=0; samesite=lax';
    document.cookie = 'onboarded=; path=/; max-age=0; samesite=lax';
    document.cookie = 'preview=; path=/; max-age=0; samesite=lax';
  }
}

export async function getOnboardingStatus(): Promise<{ isComplete: boolean }> {
  const res = await apiClient.get<{ isComplete: boolean }>('/api/v1/onboarding/status');
  return res.data;
}

export async function saveOnboardingCollege(
  dto: OnboardingCollegeDto,
): Promise<{ isComplete: boolean }> {
  const res = await apiClient.post<{ isComplete: boolean }>('/api/v1/onboarding/step/college', dto);
  return res.data;
}

export async function saveOnboardingProfile(
  dto: OnboardingProfileDto,
): Promise<{ isComplete: boolean }> {
  const res = await apiClient.post<{ isComplete: boolean }>('/api/v1/onboarding/step/profile', dto);
  return res.data;
}

export async function saveOnboardingTargets(
  dto: OnboardingTargetsDto,
): Promise<{ isComplete: boolean }> {
  const res = await apiClient.post<{ isComplete: boolean }>('/api/v1/onboarding/step/targets', dto);
  if (res.data.isComplete) {
    // Update the middleware onboarding hint (UX only — server is authority).
    document.cookie = 'onboarded=1; path=/; samesite=lax';
  }
  return res.data;
}

export interface College {
  id: string;
  name: string;
  state: string;
  city: string;
}

export async function forgotPassword(dto: AuthForgotPasswordDto): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>('/api/v1/auth/forgot-password', dto, {
    auth: 'login',
  });
  return res.data;
}

export async function resetPassword(dto: AuthResetPasswordDto): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>('/api/v1/auth/reset-password', dto, {
    auth: 'login',
  });
  return res.data;
}

/** OTP-based reset (forgot-password flow) — {email, code, password}. */
export async function resetPasswordOtp(
  dto: AuthResetPasswordOtpDto,
): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>('/api/v1/auth/reset-password-otp', dto, {
    auth: 'login',
  });
  return res.data;
}

export async function listColleges(params: {
  state?: string;
  city?: string;
  search?: string;
  limit?: number;
}): Promise<College[]> {
  const qs = new URLSearchParams();
  if (params.state) qs.set('state', params.state);
  if (params.city) qs.set('city', params.city);
  if (params.search) qs.set('search', params.search);
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  // Public endpoint — used by the signup wizard + profile picker.
  const res = await apiClient.get<College[]>(`/api/v1/colleges${suffix}`, { auth: 'public' });
  return res.data;
}

/** "Other" option — request a college be added to the directory. Best-effort. */
export async function suggestCollege(body: { name: string; city?: string; state?: string }): Promise<void> {
  await apiClient.post('/api/v1/colleges/suggestions', body, { auth: 'public' });
}
