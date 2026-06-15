# Free-First-Review Onboarding — the activation + paywall moment

**Status:** spec (not built). Owner: Joseph. Drafted 2026-06-14.
**Gate it behind** `VITE_FIRST_REVIEW_FLOW` (build flag, default off) + the BE
`AI_TOKEN_ENFORCEMENT` flip. Ship dormant; turn on the moment **1.0.7 (the
analyzer) is live on the App Store**. Do not enable before the analyzer is
approved — the free review is the thing it sells.

---

## 1. Why this exists (the strategy in one paragraph)

From the monetization playbook (moves 3 + 4): **90% of trial starts and 44.5%
of purchases happen on Day 0.** The single highest-leverage moment we have is a
new user's first session. The play: collect a couple of micro-commitments →
let them run **exactly one free Tape Review** so they feel the "aha" (real
casting-grade notes on their own take) → present the paywall **right after the
reveal**, while the value is still on screen. Onboarding paywalls convert ~2x
in-app gates. This solves activation (people don't discover the analyzer) and
monetization (nobody's paying yet) in the same flow.

The "aha" is non-negotiable before the ask. We gate **after** value, never
before.

---

## 2. The flow (6 beats)

We already have most of the surface — `AuroraOnboarding.jsx` collects
Interests / Goals / Level today. We extend it, we don't rebuild it.

```
[1] Welcome            existing AuroraOnboarding step 1
[2] Micro-commitments  existing steps — "what do you audition for?",
                       "how often do you self-tape?" (Interests/Goals/Level).
                       Keep it to ≤3 taps. This is the commitment device.
[3] The offer          NEW step: "Run your first Tape Review free — upload a
                       take, get casting-grade notes in ~30s." One CTA:
                       [ Try my free review ]. One skip: [ Maybe later ].
[4] Free review        Route into TapeReview with a `firstFree` context so the
                       AI gate + token check are bypassed exactly once.
                       Reuse TapeAnalyzerTutorial for the first-run coachmark.
[5] The reveal         Notes animate in (existing TapeReview result view).
                       This is the magic — let it breathe. No paywall yet.
[6] The ask            On result-dismiss (or a "Review another take" tap),
                       present the Membership paywall as a sheet, pre-selected
                       on Plus (popular) or the weekly plan if WEEKLY_ENABLED.
                       Headline ties to what they just saw:
                       "Get notes like that on every take."
```

Skip paths: a user who taps "Maybe later" at [3] lands in the app normally and
sees the standard in-app gate later (the existing 402 path). We don't lose
them; we just didn't convert on Day 0.

---

## 3. State & flags

| Flag / key | Where | Purpose |
|---|---|---|
| `VITE_FIRST_REVIEW_FLOW` | build env | Master on/off for the whole flow. Off → onboarding behaves exactly as today. |
| `reader_onboarding_seen` | redux (exists) | Already set by `AuroraOnboarding.finish()`. Don't reuse it for the review — see below. |
| `first_review_offered` | redux + persisted | Set true when beat [3] renders, so we never re-pitch the free review. |
| `first_review_used` | **BE-owned** (see §4) | Source of truth for "has this user spent their one free analyzer run". FE reads it from the settings/me payload. |

Why a separate `first_review_used` and not localStorage: the grant has real
cost (an AI call). A localStorage flag is trivially reset by reinstalling →
unlimited free reviews. The entitlement must live on the user record.

---

## 4. BE contract (what the FE depends on)

The FE flow needs the BE to grant **one** free analyzer run per user, even when
`AI_TOKEN_ENFORCEMENT` is on. Proposed (BE work, not in this FE spec):

- Add `first_review_used` (Boolean, default False) to the user/profile or
  `TokenBalance`.
- On the analyzer endpoints (`/v1/ai/jericho/` review-tape, compare-takes,
  sides): if the token check would fail **and** `first_review_used` is False,
  allow the call, then set `first_review_used = True` atomically.
- Expose `first_review_used` (and `weekly_enabled`, for the paywall) on the
  `/settings` or `/me` response the FE already loads at boot.

Until that ships, the FE flow can be exercised against today's
`unlimited=True` alpha state (every call is already free) — the gate just
won't bite. That's fine for building/QA; the entitlement matters only once
enforcement flips on.

---

## 5. Files to touch (FE)

- `src/panels/Onboarding/AuroraOnboarding.jsx` — add beat [3] (the offer step)
  before `finish()` (currently ~845-881). On "Try my free review", set
  `first_review_offered`, close onboarding, and navigate to TapeReview with a
  `firstFree` flag (use the `drst-navigate` event on mobile — `navigate()`
  no-ops on Capacitor, see project memory).
- `src/panels/Mobile/MobileApp.jsx` — onboarding already fires after settings
  load (~1017-1024) and lazy-loads `TapeReview` (~105). Thread the `firstFree`
  context into the TapeReview mount so it knows to skip the AI gate once and to
  arm the post-reveal paywall.
- `src/components/AIConsent/useAIGate.js` — add a `bypassOnce` path for the
  first-free run. Consent (AI-data) is still required — bypass the **token**
  gate, not the **consent** gate. Apple 5.1.1 / our AI-consent doctrine.
- `src/redux/features/jericho/jerichoSlice.js` — `aiErrorMessage()` already
  maps 402 → "out of AI tokens". After a `firstFree` run completes, dispatch
  the paywall sheet instead of relying on a later 402.
- `src/panels/Dashboard/Membership/index.jsx` — accept a `context="first_review"`
  prop so the paywall can render the tied headline + pre-select Plus/weekly.
  Weekly support already wired behind `WEEKLY_ENABLED`.
- `src/components/.../TapeAnalyzerTutorial.jsx` — reuse for the first-run
  coachmark inside beat [4] (keyed off `TAPE_TUTORIAL_KEY`).

---

## 6. Telemetry (PostHog — extend the Beta Launch funnels)

Fire these so we can see exactly where the Day-0 funnel leaks:

```
onboarding_offer_shown        beat [3] rendered
first_review_started          upload begins
first_review_completed        notes rendered (the aha)
first_review_paywall_shown    beat [6] sheet opened
first_review_paywall_purchase plan bought from this sheet
first_review_paywall_dismiss  closed without buying
```

Funnel: offer_shown → started → completed → paywall_shown → purchase. The
started→completed step is the activation metric; paywall_shown→purchase is the
Day-0 conversion metric.

---

## 7. Rollout

1. Build behind `VITE_FIRST_REVIEW_FLOW=off`. Nothing changes for users.
2. Ship the BE `first_review_used` entitlement (dormant — only bites when
   enforcement is on).
3. **1.0.7 approved + live** → cut a fresh TF build (iOS-catchup ritual), flip
   `VITE_FIRST_REVIEW_FLOW=on`, and flip `AI_TOKEN_ENFORCEMENT` on for **new**
   users while grandfathering the existing ~130 (playbook move 1).
4. Watch the funnel for one audition cycle (~1 week) before touching prices.

Sequence per the playbook: analyzer live → free first review (activation) →
hard paywall + weekly (monetization) → content/UGC engine. This doc is step 2.
