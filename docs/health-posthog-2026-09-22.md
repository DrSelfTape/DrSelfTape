# App health and PostHog investigation — September 22, 2026

Confirmed review-completion tracking defects are fixed locally and verified. No deployment, App Store submission, customer message, or entitlement change was made.

## Findings

- Over the preceding seven days PostHog recorded 40 `repeat_review_completed` events across 7 people, versus 11 backend tape reviews across 4 accounts. These sources have different scope; the difference alone is not a count of duplicate events.
- The TapeReview result effect counted recovered historical notes as new repeat completions and reran after remounts. Its first-review guard was also immediately deleted after firing. Both paths could inflate completion events. Events lacked a review identifier, so historical counts cannot be reliably deduplicated.
- Seven insufficient-token events affected four people: tape review (3 events, 2 people), compare takes (2, 1), and coaching (2, 1). The interceptor emits these for HTTP 402 with `insufficient_tokens`; no evidence established an entitlement bug. The modal's claim about “today's free AI” was misleading and is now “You've used your included AI actions.”
- Twelve rage-click signals across eight people were scattered across dashboard/navigation, profile, Slate, and login/signup/reset-password surfaces. Several involved fields rather than buttons. These signals did not establish a single broken control; no speculative button changes were made. Replaying the affected interactions is still required to diagnose any individual incident.

## Changes

New completions receive a stable receipt, preferring the server session ID, with job/attempt/request fallbacks. A per-account receipt is claimed once across component remounts and normal local-storage persistence. Memory deduplication remains available if storage is blocked; it cannot persist across restarts in that case.

Recovered historical notes carry no new-completion receipt. First and repeat completion events share the receipt guard, preventing a first result from becoming a repeat event when its flow closes. New events include `review_id` and `tracking_version: 2`, allowing later measurement to isolate corrected clients and count distinct reviews. Genuine resumed-job completions still emit once. Displaying notes continues to have its separate view event.

Existing historical data is unchanged. Completion events remain client observations, not an authoritative server count: lost telemetry, unopened results, multiple devices, and blocked storage can affect coverage. Use backend review records for completed-review totals. The previously reported 15% 48-hour first-review activation is a legacy client-event estimate, not a reconciled server conversion rate. Older app builds continue to emit the old events until updated.

## VERIFY RESULTS

Project: Vite / React (JavaScript; no TypeScript project configuration).
Commands run: 5.

- PASS: `yarn lint`.
- PASS: `yarn build` (existing chunk-size warning above 500 kB; no Sentry upload in this local build).
- PASS: review-completion and recording-review regression tests — 30 tests.
- PASS: first-review sample and durable review-note checks — 23 tests, including browser coverage.
- PASS: `git diff --check`.

Status: PASS.

Coverage includes retry/remount deduplication, historical recovery suppression, first-to-repeat flow transitions, real resumed completions, account isolation, blocked-storage fallback, existing recording review paths, and saved-note/first-review browser behavior. It does not establish native device, billing, camera, or production release health.

## Release and follow-up

Changes remain in the working tree. After release, segment PostHog by `tracking_version: 2` and compare distinct `review_id` counts with backend records over the same interval. Keep legacy events separate. Review rage-click session context before assigning a cause or changing navigation. No conversion uplift is claimed from this tracking correction.
