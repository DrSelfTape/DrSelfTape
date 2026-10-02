/**
 * A hold that keeps the root AgeGateModal closed while another surface is
 * itself collecting the birthdate.
 *
 * AgeGateModal opens the instant an authenticated user has no
 * `date_of_birth`. Sign in with Apple authenticates BEFORE anyone can ask
 * for a birthdate (Apple never supplies one), so without a hold the gate
 * paints over the sign-in card the moment the Apple token verifies — and
 * the first screen a brand-new Apple user sees is a blocking legal form
 * instead of onboarding and the free-review offer.
 *
 * Counted, not a boolean, so two surfaces can never release each other's
 * hold. Always release in a `finally` and on unmount.
 *
 * ⚠️ This modal is the ONLY thing enforcing the 13+ floor on an account with
 * a null birthdate. `apps/users/age.py` validates a date once one is
 * submitted, and `HasAiConsent` gates AI on consent — neither blocks a
 * null-DOB user, and no permission class does. So a leaked hold does not
 * just look wrong, it disables the compliance gate. Hence the deadline
 * below: a hold is a short lease, never a permanent grant. Collecting a
 * birthdate takes seconds; if one is still outstanding minutes later,
 * something went wrong and the gate belongs back on screen.
 */
const HOLD_MAX_MS = 3 * 60 * 1000;

let holds = 0;
const listeners = new Set();

export function holdAgeGate() {
  holds += 1;
  listeners.forEach((fn) => fn());
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(timer);
    holds = Math.max(0, holds - 1);
    listeners.forEach((fn) => fn());
  };
  // Self-releasing lease — an unmount we failed to catch cannot silently
  // hold the gate open for the rest of the session.
  const timer = setTimeout(release, HOLD_MAX_MS);
  return release;
}

export function isAgeGateHeld() {
  return holds > 0;
}

export function subscribeAgeGateHold(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
