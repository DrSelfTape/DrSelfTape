/**
 * Age-verification helpers (FE mirror of apps/users/age.py).
 *
 * Terms §1 requires users to be at least 13 to create an account, and the
 * Privacy Policy carries the COPPA "not directed to children under 13"
 * line. The signup form and the Sign-in-with-Apple age gate both validate
 * against MIN_SIGNUP_AGE so the threshold can't drift between them.
 *
 * Server-side validation in apps/users/age.py is the real enforcement;
 * this is the friendly client-side guard that stops an under-age user
 * before a round trip.
 */
export const MIN_SIGNUP_AGE = 13;

/**
 * Whole years between an ISO date string ("YYYY-MM-DD") and today.
 * Returns NaN for an empty/invalid input so callers can treat it as
 * "not yet provided".
 */
export function calculateAge(isoDateString) {
  if (!isoDateString) return NaN;
  const dob = new Date(isoDateString);
  if (Number.isNaN(dob.getTime())) return NaN;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/** True when the ISO date is a real past date and clears MIN_SIGNUP_AGE. */
export function meetsMinAge(isoDateString) {
  const age = calculateAge(isoDateString);
  if (Number.isNaN(age)) return false;
  const dob = new Date(isoDateString);
  if (dob.getTime() > Date.now()) return false; // future date
  return age >= MIN_SIGNUP_AGE;
}
