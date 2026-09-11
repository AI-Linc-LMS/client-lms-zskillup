/**
 * Contract tests for the pre-assessment details rules. Zero-dependency: runs on
 * Node's built-in test runner with native type stripping (Node >= 22.18):
 *
 *   node --test src/shared/assessment-details.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanDetailText,
  isBranchCode,
  isCollegeValid,
  isLiveAttemptMarker,
  isValidDetailText,
  isValidPhone,
  liveAttemptKey,
  missingAssessmentDetails,
  missingDetailsFromError,
  needsAssessmentDetails,
  normalizePhone,
} from './assessment-details.ts';

test('rule 1: phone normalization strips separators and one Indian prefix', () => {
  assert.equal(normalizePhone('98765 43210'), '9876543210');
  assert.equal(normalizePhone('98765-43210'), '9876543210');
  assert.equal(normalizePhone('(987) 654.3210'), '9876543210');
  assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
  assert.equal(normalizePhone('+919876543210'), '9876543210');
  assert.equal(normalizePhone('919876543210'), '9876543210');
  assert.equal(normalizePhone('09876543210'), '9876543210');
  // "91" / "0" are only stripped when exactly 10 digits remain.
  assert.equal(normalizePhone('9198765432'), '9198765432');
  assert.equal(normalizePhone('0987654321'), '0987654321');
  assert.equal(normalizePhone(null), '');
  assert.equal(normalizePhone(undefined), '');
});

test('rule 1: phone validity', () => {
  for (const ok of ['9876543210', '6000000000', '+91 7000000000', '0 8123456789', '91-9123456789']) {
    assert.equal(isValidPhone(ok), true, ok);
  }
  for (const bad of ['', '   ', '12345', '5876543210', '98765432101', '+1 9876543210', 'abcdefghij', '9876543210x', '+91 5876543210', '0000000000']) {
    assert.equal(isValidPhone(bad), false, bad);
  }
});

test('rule 2: text cleaning (NFKC, format chars, whitespace)', () => {
  assert.equal(cleanDetailText('  Asha   Rao  '), 'Asha Rao');
  assert.equal(cleanDetailText('A​s‍ha'), 'Asha');
  assert.equal(cleanDetailText('Ａｓｈａ'), 'Asha'); // full-width → ASCII under NFKC
  assert.equal(cleanDetailText('Asha\t\nRao'), 'Asha Rao');
  assert.equal(cleanDetailText(null), '');
});

test('rule 2: text validity (>= 2 letters, <= 200 chars)', () => {
  assert.equal(isValidDetailText('Jo'), true);
  assert.equal(isValidDetailText('राम'), true);
  assert.equal(isValidDetailText('J'), false);
  assert.equal(isValidDetailText('J.'), false);
  assert.equal(isValidDetailText('1234'), false);
  assert.equal(isValidDetailText('​​'), false);
  assert.equal(isValidDetailText('   '), false);
  assert.equal(isValidDetailText(null), false);
  assert.equal(isValidDetailText('a'.repeat(200)), true);
  assert.equal(isValidDetailText('a'.repeat(201)), false);
  // Length is measured AFTER cleaning.
  assert.equal(isValidDetailText(`  ${'a'.repeat(200)}  `), true);
  // ...and in code points (like the backend and Postgres varchar), not UTF-16 units.
  assert.equal(isValidDetailText(`${'\u{1F600}'.repeat(150)}ab`), true);
  assert.equal(isValidDetailText('\u{20000}'.repeat(200)), true);
  assert.equal(isValidDetailText('\u{20000}'.repeat(201)), false);
});

test('rule 3: department codes', () => {
  for (const b of ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'OTHER']) assert.equal(isBranchCode(b), true);
  for (const b of ['', 'cse', 'Other', 'AIML', null, undefined, 3]) assert.equal(isBranchCode(b), false);
});

const complete = () => ({
  role: 'STUDENT',
  email: 'asha@example.com',
  fullName: 'Asha Rao',
  collegeId: null,
  studentProfile: { collegeId: null, collegeName: 'Atharva College', branch: 'CSE', phone: '9876543210' },
});

test('rule 5: a complete student is not gated', () => {
  assert.deepEqual(missingAssessmentDetails(complete()), []);
  assert.equal(needsAssessmentDetails(complete()), false);
});

test('rule 5: other roles and a missing /me are never gated', () => {
  for (const role of ['COLLEGE_ADMIN', 'ADMIN', 'SUPER_ADMIN']) {
    assert.deepEqual(missingAssessmentDetails({ ...complete(), role, fullName: null, studentProfile: null }), []);
  }
  assert.equal(needsAssessmentDetails(null), false);
});

test('rule 5: missing and invalid values are both reported, in form order', () => {
  const me = {
    ...complete(),
    fullName: 'J',
    email: ' ',
    studentProfile: { collegeId: null, collegeName: 'x', branch: null, phone: '12345' },
  };
  assert.deepEqual(missingAssessmentDetails(me), ['fullName', 'collegeName', 'branch', 'email', 'phone']);
  assert.deepEqual(
    missingAssessmentDetails({ ...complete(), studentProfile: null }),
    ['collegeName', 'branch', 'phone'],
  );
});

test('rule 5: legacy-but-valid phone formats pass; junk does not', () => {
  const withPhone = (phone) => ({ ...complete(), studentProfile: { ...complete().studentProfile, phone } });
  assert.deepEqual(missingAssessmentDetails(withPhone('+91 98765-43210')), []);
  assert.deepEqual(missingAssessmentDetails(withPhone('0000')), ['phone']);
});

test('rule 4/5: college resolution prefers the top-level value and trusts a canonical FK', () => {
  // Top-level collegeName (new backend) wins over the profile copy.
  const top = { ...complete(), collegeName: 'IIT Bombay', studentProfile: { ...complete().studentProfile, collegeName: null } };
  assert.equal(isCollegeValid(top), true);
  // Explicit null top-level falls back to the profile value (?? semantics).
  const nullTop = { ...complete(), collegeName: null };
  assert.equal(isCollegeValid(nullTop), true);
  // A 1-letter free-text college is invalid...
  const junk = { ...complete(), studentProfile: { ...complete().studentProfile, collegeName: 'X' } };
  assert.deepEqual(missingAssessmentDetails(junk), ['collegeName']);
  // ...but a name that resolves through an FK is canonical and always valid.
  assert.deepEqual(missingAssessmentDetails({ ...junk, collegeId: 'c1' }), []);
  assert.deepEqual(
    missingAssessmentDetails({ ...junk, studentProfile: { ...junk.studentProfile, collegeId: 'c1' } }),
    [],
  );
  // An FK with no resolvable name is still missing.
  const fkNoName = { ...complete(), collegeId: 'c1', studentProfile: { ...complete().studentProfile, collegeName: null } };
  assert.deepEqual(missingAssessmentDetails(fkNoName), ['collegeName']);
});

test('error payload helpers', () => {
  assert.deepEqual(missingDetailsFromError({ missing: ['phone', 'bogus', 'fullName'] }), ['fullName', 'phone']);
  assert.deepEqual(missingDetailsFromError({ missing: 'phone' }), []);
  assert.deepEqual(missingDetailsFromError(undefined), []);
  assert.deepEqual(missingDetailsFromError(null), []);
});

test('live-attempt marker', () => {
  assert.equal(liveAttemptKey('m1', 's1'), 'assessment-live:m1:s1');
  assert.equal(liveAttemptKey('m1'), 'assessment-live:m1:none');
  assert.equal(liveAttemptKey('m1', null), 'assessment-live:m1:none');
  const now = Date.parse('2026-09-13T06:30:00Z');
  assert.equal(isLiveAttemptMarker('2026-09-13T07:30:00Z', now), true);
  assert.equal(isLiveAttemptMarker('2026-09-13T06:00:00Z', now), false);
  assert.equal(isLiveAttemptMarker('garbage', now), false);
  assert.equal(isLiveAttemptMarker(null, now), false);
});
