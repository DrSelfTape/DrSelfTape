# DST Monetization Fix — 2026-07-12 (Option 3: genuine free/premium split)

## Why they won't pay (diagnosis, from live BE data)
- **190 users, 15 weekly-active, 1 paying.** Activation-to-aha is healthy (~25% of new signups complete a first Tape Review — near the honest ceiling). The leak is **conversion**, not top-of-funnel.
- **The subscription sells "unlimited tokens" — but tokens never bind.** Only **4 of 190** users have ever hit 0 tokens; 107 have 20+. Signup = 5 tokens, a review = 1, first review free, and **84 admin resets** (`admin_reset` + `admin_reset_to_20`) top people back up.
- **Every tier is differentiated by token count** (Basic 10 / Plus 20 / Premium "unlimited"). Tape Review, Compare Takes, BYOS all work for *free* users via tokens.
- **Net: for real usage, free ≈ premium.** The paywall asks people to pay to remove a limit they never feel, for features they already have. No copy rewrite fixes this — the *model* must give Premium something free doesn't have.

## The fix (Option 3): free = the headline, Premium = the full casting read
The BE already generates the **full** analysis (`verdict`, `whats_working`, `performance` deep read, `adjustments`, `scores`, `performance_dna`, `the_one_thing`) and the FE currently renders **all of it to everyone**. Split it:

| Section (result field) | Free | Premium |
|---|---|---|
| Quick read / verdict (`r.verdict`, `tone_tags`) | ✅ | ✅ |
| Top strength (first of `whats_working`) | ✅ | ✅ |
| The one thing (first `adjustments` item / `the_one_thing`) | ✅ | ✅ |
| **Performance read** (`r.performance`, deep craft) | 🔒 | ✅ |
| **Full adjustments** (items 2..n) | 🔒 | ✅ |
| **Technical scores grid** (`r.scores`) | 🔒 | ✅ |
| **Performance DNA** (`r.performance_dna`, emotional arc) | 🔒 | ✅ |
| Unlimited reviews (no token counting) | — | ✅ |

Free gets a genuinely useful read (verdict + one strength + the one fix) — enough to prove value and create desire. Premium unlocks the **full casting read** on every tape. This is honest: Premium really does show more.

## Build order (FE-first; the deep data already exists)

1. **Entitlement into TapeReview.** It reads only `s.jericho` today. Add subscription status (`unlimited`/active plan) — fetch `/v1/subscriptions/status/` or read a shared slice (Membership uses local state + `bookings.membership`). Add `isSubscribed`.
   - File: `src/panels/Dashboard/Jericho/TapeReview.jsx`
2. **Gate the deep sections.** In the result render (`if (tapeReviewResult)`, ~L474+), when `!isSubscribed`: render Quick read + first `whats_working` + first `adjustments`, then a **`<FullReadLocked/>`** card (blurred preview of the scores/DNA grid + "Unlock your full casting read — Premium" → `onUpgrade`). When subscribed, render everything as today.
3. **Reframe `FirstReviewPaywall`** (~L30) to sell the split honestly: *"You got the headline. Premium unlocks your full casting read on every tape — the scorecard, your Performance DNA, take-by-take — plus unlimited reviews."* CTA → plans/trial.
4. **Reframe the tiers** (`src/panels/Dashboard/Membership/index.jsx` PLANS): lead with the outcome/depth, not token counts. Premium = "The full casting read on every audition + unlimited." Keep token lines secondary/honest.
5. **Instrument:** add `first_review_fullread_locked_shown` + `..._tap` so we can measure the new gate's conversion.

## BE / ops (the accelerant)
- **STOP the admin token resets.** The 84 `admin_reset*` transactions are refilling users so they never feel a wall — actively suppressing conversion. If it's a manual `manage.py` command, just stop running it. If automated, disable it. Keep the free first review + the 5-token signup bonus; don't top up beyond that.
- Optional later: a real free-tier cap (e.g., free = the headline read on unlimited tapes, but the *full* read is Premium-only) so scarcity lives on **depth**, not token count.

## Apple / compliance
- Keep every paywall claim truthful (2.3.1): Premium genuinely shows the full read + unlimited — don't imply free features are locked when they aren't.
- FE-only changes ride the next iOS build (bundle per the standing rule). Test the free vs subscribed render on-device before submit.

## Success metric
Conversion of **activated users → paid** (today ~1/22). Watch `first_review_fullread_locked_shown → paywall_tap → subscribe`.
