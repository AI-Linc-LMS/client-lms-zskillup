/**
 * Tests for the customer-contact helpers: Google phone candidates, masking, failure messages,
 * the Razorpay prefill, the ledger's customer resolution (legacy backend vs resolved nulls),
 * and POST /me/phone/google through the real API client (a rejected GOOGLE token must never
 * be treated as a dead session). Zero-dependency: Node's
 * built-in test runner with native type stripping (Node >= 22.18):
 *
 *   node --test src/lib/profile/google-phone.test.mjs
 *
 * The modules under test use the app's `@/` alias and extensionless relative imports, so a
 * resolve hook maps those to the .ts files first; the modules are then loaded with a
 * dynamic import (a static one would be resolved before the hook exists).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { URL, fileURLToPath } from 'node:url';

const SRC = new URL('../../', import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null;
    if (specifier.startsWith('@/')) target = new URL(specifier.slice(2), SRC);
    else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith('file:')) {
      target = new URL(specifier, context.parentURL);
    }
    if (target && !/\.[cm]?[jt]sx?$/.test(target.pathname)) {
      for (const ext of ['.ts', '/index.ts']) {
        const candidate = new URL(target.href + ext);
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { cleanGooglePhones, describeGooglePhoneFailure, maskPhone, phoneLabels } = await import('./google-phone.ts');
const { checkoutContact, checkoutPrefillFromMe, widgetPrefill } = await import('@/lib/payments/checkout-contact');
const { customerOf } = await import('@/lib/payments/ledger-customer');
const { GoogleConsentError } = await import('@/lib/google/identity');
const { ApiRequestError } = await import('@/lib/api/types');

test('cleanGooglePhones keeps valid mobiles only, normalised, de-duplicated, primary first', () => {
  const out = cleanGooglePhones([
    { phone: '+91 91234 56789', primary: false },
    { phone: '12345', primary: true }, // invalid - dropped even though primary
    { phone: '09876543210', primary: true },
    { phone: '9876543210', primary: false }, // duplicate of the one above
    { phone: 42, primary: true }, // not a string
    { phone: '5876543210', primary: false }, // does not start 6-9
  ]);
  assert.deepEqual(out, [
    { phone: '9876543210', primary: true },
    { phone: '9123456789', primary: false },
  ]);
});

test('cleanGooglePhones promotes a duplicate that Google marks primary later', () => {
  assert.deepEqual(
    cleanGooglePhones([
      { phone: '9123456789', primary: false },
      { phone: '9876543210', primary: false },
      { phone: '+919876543210', primary: true },
    ]),
    [
      { phone: '9876543210', primary: true },
      { phone: '9123456789', primary: false },
    ],
  );
  assert.deepEqual(cleanGooglePhones([]), []);
});

test('maskPhone shows the first and last two digits', () => {
  assert.equal(maskPhone('9876543210'), '98xxxxxx10');
  assert.equal(maskPhone('123'), '123');
});

test('phoneLabels falls back to full numbers only where masks collide', () => {
  assert.deepEqual(phoneLabels(['9876543210', '9123456789']), ['98xxxxxx10', '91xxxxxx89']);
  assert.deepEqual(phoneLabels(['9876543210', '9811111110', '9123456789']), ['9876543210', '9811111110', '91xxxxxx89']);
});

test('checkoutContact only ever yields a valid normalised 10-digit mobile', () => {
  assert.equal(checkoutContact('+91 98765-43210'), '9876543210');
  assert.equal(checkoutContact('09876543210'), '9876543210');
  assert.equal(checkoutContact('12345'), undefined);
  assert.equal(checkoutContact('5876543210'), undefined);
  assert.equal(checkoutContact(''), undefined);
  assert.equal(checkoutContact(null), undefined);
  assert.equal(checkoutContact(undefined), undefined);
});

test('checkoutPrefillFromMe carries name, email and a valid profile phone', () => {
  const me = { fullName: 'Asha Rao', email: 'asha@example.com', studentProfile: { phone: '+91 98765 43210' } };
  assert.deepEqual(checkoutPrefillFromMe(me), { name: 'Asha Rao', email: 'asha@example.com', contact: '9876543210' });
  assert.equal(checkoutPrefillFromMe({ ...me, studentProfile: { phone: '98765' } }).contact, null);
  assert.equal(checkoutPrefillFromMe({ ...me, studentProfile: null }).contact, null);
  assert.deepEqual(checkoutPrefillFromMe(null), { name: null, email: null, contact: null });
});

test('widgetPrefill omits blanks and only ever passes a valid mobile to the widget', () => {
  assert.deepEqual(widgetPrefill({ name: 'Asha Rao', email: 'asha@example.com', contact: '+91 98765 43210' }), {
    name: 'Asha Rao',
    email: 'asha@example.com',
    contact: '9876543210',
  });
  // An invalid/legacy profile value is dropped rather than shown for the buyer to fix.
  assert.deepEqual(widgetPrefill({ name: 'Asha Rao', email: '', contact: '98765' }), { name: 'Asha Rao' });
  assert.deepEqual(widgetPrefill({ name: null, email: null, contact: null }), {});
  assert.deepEqual(widgetPrefill(undefined), {});
});

// The ledger's whole "safe to deploy the frontend before the backend" claim: absent
// customer* keys mean an older backend (fall back), present-but-null means "none".
const legacyRow = {
  userName: 'Legacy Name',
  email: 'legacy@example.com',
  phone: '9000000000',
};

test('customerOf falls back to the legacy fields only when no customer* key is present', () => {
  assert.deepEqual(customerOf(legacyRow), {
    name: 'Legacy Name',
    email: 'legacy@example.com',
    phone: '9000000000',
    phoneNote: null,
  });
  // One resolved key is enough to trust the server's answer for all three.
  assert.deepEqual(customerOf({ ...legacyRow, customerPhone: null, customerPhoneSource: null }), {
    name: null,
    email: null,
    phone: null,
    phoneNote: null,
  });
});

test('customerOf never mixes resolved nulls with the legacy snapshot', () => {
  assert.deepEqual(
    customerOf({ ...legacyRow, customerName: null, customerEmail: null, customerPhone: null, customerPhoneSource: null }),
    { name: null, email: null, phone: null, phoneNote: null },
  );
});

test('customerOf captions a checkout-typed phone only', () => {
  const row = { ...legacyRow, customerName: 'Asha Rao', customerEmail: 'asha@example.com', customerPhone: '9876543210' };
  assert.equal(customerOf({ ...row, customerPhoneSource: 'CHECKOUT' }).phoneNote, 'from checkout');
  assert.equal(customerOf({ ...row, customerPhoneSource: 'PROFILE' }).phoneNote, null);
  assert.equal(customerOf({ ...row, customerPhoneSource: null }).phoneNote, null);
  // No phone → no caption, whatever the stored source says.
  assert.equal(customerOf({ ...row, customerPhone: null, customerPhoneSource: 'CHECKOUT' }).phoneNote, null);
  assert.equal(customerOf({ ...row, customerPhoneSource: 'CHECKOUT' }).name, 'Asha Rao');
});

test('describeGooglePhoneFailure maps consent outcomes', () => {
  assert.equal(describeGooglePhoneFailure(new GoogleConsentError('cancelled')).tone, 'info');
  assert.match(describeGooglePhoneFailure(new GoogleConsentError('popup_blocked')).message, /pop-ups/);
  assert.match(describeGooglePhoneFailure(new GoogleConsentError('scope_denied')).message, /phone permission/);
  assert.equal(describeGooglePhoneFailure(new GoogleConsentError('not_configured')).disabled, true);
  assert.equal(describeGooglePhoneFailure(new GoogleConsentError('unavailable')).tone, 'error');
});

test('describeGooglePhoneFailure maps the server error codes', () => {
  const api = (status, code) => new ApiRequestError(status, { code, message: 'x' });
  assert.equal(describeGooglePhoneFailure(api(404, 'FEATURE_DISABLED')).disabled, true);
  assert.match(describeGooglePhoneFailure(api(401, 'GOOGLE_TOKEN_INVALID')).message, /could not confirm/);
  assert.match(describeGooglePhoneFailure(api(502, 'GOOGLE_UNAVAILABLE')).message, /reach Google/);
  assert.match(describeGooglePhoneFailure(api(429, 'TOO_MANY_REQUESTS')).message, /wait a minute/);
  assert.equal(describeGooglePhoneFailure(new Error('boom')).tone, 'error');
  assert.equal(describeGooglePhoneFailure(api(500, 'INTERNAL')).disabled, undefined);
});

// ── POST /me/phone/google through the real API client ──────────────────────────────────
// A logged-in page: the role hint cookie is set and an access token is in memory.
globalThis.document = { cookie: 'role=STUDENT', visibilityState: 'visible' };
const { authToken } = await import('@/store/auth');
const { fetchGooglePhones } = await import('@/lib/api/me');
authToken.set('session-access-token');

function fakeFetch(responder) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const { status, body } = responder(String(url), init);
    return new globalThis.Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return calls;
}

test('fetchGooglePhones posts the token once and returns cleaned numbers', async () => {
  const calls = fakeFetch(() => ({
    status: 200,
    body: { data: { phones: [{ phone: '9876543210', primary: true }, { phone: '000', primary: false }] } },
  }));
  const phones = await fetchGooglePhones('google-access-token');
  assert.deepEqual(phones, [{ phone: '9876543210', primary: true }]);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/v1\/me\/phone\/google$/);
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { accessToken: 'google-access-token' });
  // Our session token authenticates the call; the Google token only travels in the body.
  assert.equal(calls[0].init.headers.Authorization, 'Bearer session-access-token');
});

test('a rejected GOOGLE token (401 GOOGLE_TOKEN_INVALID) surfaces without a session refresh', async () => {
  const calls = fakeFetch(() => ({
    status: 401,
    body: { error: { code: 'GOOGLE_TOKEN_INVALID', message: 'Google token is invalid' } },
  }));
  await assert.rejects(fetchGooglePhones('expired-google-token'), (err) => {
    assert.ok(err instanceof ApiRequestError);
    assert.equal(err.code, 'GOOGLE_TOKEN_INVALID');
    return true;
  });
  assert.equal(calls.length, 1, 'no /auth/refresh and no retry');
});

test('a session 401 on the same call still refreshes and retries once', async () => {
  let phoneCalls = 0;
  const calls = fakeFetch((url) => {
    if (url.endsWith('/api/v1/auth/refresh')) return { status: 200, body: { data: { accessToken: 'a.e30.b' } } };
    phoneCalls += 1;
    return phoneCalls === 1
      ? { status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'expired' } } }
      : { status: 200, body: { data: { phones: [] } } };
  });
  assert.deepEqual(await fetchGooglePhones('google-access-token'), []);
  assert.deepEqual(
    calls.map((c) => c.url.replace(/^https?:\/\/[^/]+/, '')),
    ['/api/v1/me/phone/google', '/api/v1/auth/refresh', '/api/v1/me/phone/google'],
  );
});

test('FEATURE_DISABLED and GOOGLE_UNAVAILABLE surface as ApiRequestErrors', async () => {
  fakeFetch(() => ({ status: 404, body: { error: { code: 'FEATURE_DISABLED', message: 'off' } } }));
  await assert.rejects(fetchGooglePhones('t'), { code: 'FEATURE_DISABLED', status: 404 });
  fakeFetch(() => ({ status: 502, body: { error: { code: 'GOOGLE_UNAVAILABLE', message: 'down' } } }));
  await assert.rejects(fetchGooglePhones('t'), { code: 'GOOGLE_UNAVAILABLE', status: 502 });
});
