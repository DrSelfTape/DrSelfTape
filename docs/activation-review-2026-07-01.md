# DST Activation & Revenue Plan — Synthesis of 6 Code-Grounded Lenses

**Framing:** 149 signups → ~7 weekly active. The code review shows the leak is not the analyzer (well-built) or onboarding screens (well-architected) — it's that (a) the app's own guidance systems never route anyone to the aha, (b) the aha is fragile at the last 30 seconds (no tape, stacked modals, results that evaporate), and (c) every re-engagement trigger requires a second human that doesn't exist yet at this network density.

---

## 🎯 Single Highest-Leverage Move

**Make the free Tape Review permanently findable after onboarding — wire it into `getMobileNextStep` and `TutorialChecklist`, and persist the unclaimed offer as the top Home hook.**

Why this beats everything else: iOS builds (where the nightly ad installs land) *already carry* `VITE_FIRST_REVIEW_FLOW=true` via `.env.local:7` — so the offer screen exists. But it is **one-shot**: `skipFirstReview` (AuroraOnboarding.jsx:1027-1032) + `reader_onboarding_seen=true` (MobileApp.jsx:1049-1052) means one "Maybe later" tap permanently deletes the activation path. Then *both* guided-action systems — `getMobileNextStep` (MobileApp.jsx:946-968) and `TutorialChecklist.jsx:14-22` — steer users to headshots, scene generation, and audition logging, never once to Tape Review, while the "hero feature" card renders ~7th on Home, below the fold (MobileApp.jsx:1207). Three lenses independently converged on this. Every other activation fix (push, sample review, upsell) only fires if the user reaches TapeReview at all; this is the gate. It's a JSX-branch change measurable within one night of ads via the existing `FIRST_REVIEW_*` events.

---

## NOW (this week — small/medium effort, highest leverage)

### 1. Route all guidance at Tape Review + make the free-review offer persistent *(activation · high impact · small)*
- **Evidence:** `getMobileNextStep` MobileApp.jsx:946-968 (5 branches, zero mention Tape Review); TutorialChecklist.jsx:14-22 (7 steps, none analyzer); web `ONBOARDING_STEPS` Home/index.jsx:66-130 same gap; decliner path is one-shot (AuroraOnboarding.jsx:1027-1032 → MobileApp.jsx:1049-1052).
- **Change:** (a) Add a top-priority `getMobileNextStep` branch when the BE `first_review_used` flag is false — "Your free Tape Review is waiting" → sets `firstReviewActive`, jumps to tape-review tab; (b) add "Get your first AI Tape Review" as step 2 of both checklists, completed on `Events.FIRST_REVIEW_COMPLETED` (hook exists, TapeReview.jsx:116-119); (c) for zero-review users, hoist the hero card (MobileApp.jsx:1207-1233) above the gamification stack with "Your first review is free →" copy.

### 2. Set `VITE_FIRST_REVIEW_FLOW=true` in Vercel prod *(activation · high · trivial)*
- **Evidence:** Flag lives only in machine-local `.env.local:7` — baked into iOS builds, absent from Vercel; web signups get the offer parked dead-last (AuroraOnboarding.jsx:29) and desktop-width users get the legacy `ReaderOnboardingModal` with no offer at all (Home/index.jsx:224-228, DashboardLayout.jsx:8-11).
- **Change:** One Vercel env var + redeploy so web ad traffic runs the same funnel as iOS. (Desktop-onboarding port → NEXT.) Verify by watching `first_review_offer_shown` in PostHog the first night.

### 3. Send the `tape_review_complete` push *(activation+retention · high · one-liner)*
- **Evidence:** `_finish_ok` (apps/ai/jobs.py:68-76) does a CAS update and nothing else; zero notification imports in apps/ai/. The FE tap-router **already routes** `tape_review_complete` to the tape-review tab (usePushNotifications.js:91-95) — a deep link for a push that's never sent. Current UX literally says "keep the app open" (TapeReview.jsx:199-203) during a multi-minute analysis.
- **Change:** Call `send_notification(job.user_id, 'tape_review_complete', …)` in `_finish_ok` (and `_finish_fail` for refunds), add the title to `NOTIFICATION_TITLES` (notifications/utils.py:9-18), flip FE copy to "we'll notify you when your notes are ready." Converts the aha from foreground-hostage to guaranteed return visit.

### 4. Stop the cold push-permission ask at app mount *(retention multiplier · high · small)*
- **Evidence:** usePushNotifications.js:284-295 auto-calls `subscribe()` → iOS system dialog at cold open (MobileApp.jsx:983), front-running the carefully-placed post-value onboarding notif step (AuroraOnboarding.jsx:605-629). Denied users have no recovery path (lines 210-212).
- **Change:** Gate mount-time auto-subscribe to `checkPermissions()==='granted'` (mirror the web branch at :291); first ask only at the onboarding step. Add a denied-state recovery banner post-first-review deep-linking to iOS Settings. This multiplies #3 and every future loop.

### 5. Fix token-grant ordering so the "free" first review is actually free *(monetization timing · high · small)*
- **Evidence:** `SIGNUP_BONUS = 25` (users/signals.py:19) vs the free-review grant firing only when `balance < 1` (subscriptions/utils.py:244) — new users burn a normal token on the "free" review and hit no wall until action #26 (~weeks at observed usage).
- **Change:** Reorder `spend_token` so an unused `first_review` grant is consumed before the balance for analyzer runs, **and** cut `SIGNUP_BONUS` to ~5 so the paywall lands day 1-2 *after* first value. Measure with existing `FIRST_REVIEW_*` events.

### 6. Close the dead referral wire + instrument sharing *(growth · high · hours)*
- **Evidence:** BE generates `?ref={code}` links and has a working 50-token reward endpoint (growth/views.py:42, 48-118); the FE Invite panel promises the reward (Referral/index.jsx:94-98) — but SignUp never reads `?ref=` (registrationPayload, SignUp/index.jsx:105-110) and repo-wide grep for `referral/apply` returns **zero FE hits**. Every share today rewards nobody; the promise is currently false. Sharing is also fully uninstrumented (no SHARE/REFERRAL events in analytics.js).
- **Change:** Read `?ref=` on /signup → localStorage → POST `/v1/growth/referral/apply/` after register fulfills → "+50 tokens" toast + referrer push. Add `REFERRAL_SHARE_TAP / REFERRAL_APPLIED / SCORECARD_SHARE_TAP` events. Zero BE changes.

### 7. Make the Home token card tappable + de-stack the pre-upload interstitials *(revenue + friction · high/medium · small)*
- **Evidence:** The app's only proactive paywall entry is a non-tappable `<span>` (MobileApp.jsx:1605-1630, badge :1621-1628, renders only at balance 0). Separately, first upload stacks tutorial (TapeReview.jsx:104-108) + AI consent (:85) with an app-remounting consent flow requiring the `dst_first_review` sessionStorage hack (MobileApp.jsx:3189-3207).
- **Change:** Token card → `setCurrentPanel('membership')` (mind the drst-navigate + tap-belt gotchas), show upgrade chip at balance ≤3. Await `requestAiConsent()` inside `launchFirstReview` *before* closing onboarding; suppress the tutorial when `firstReview=true` (show it post-result as "how to read your notes").

### 8. Bundle into the next iOS build (per bundle-with-next-build rule):
- **Fabricated paywall stats** — "5× more callbacks", 3%/17% rings (Membership/index.jsx:119, :134, :545) with no data behind them: swap for honest feature-anchored copy. FTC/Apple 2.3.1-shaped risk on the exact screen reviewers scrutinize.
- **Weekly-tier flip-readiness one-liner** — add `'weekly'` to the price-prefetch combos array (Membership/index.jsx:197) so the dormant path is correct when flipped; note Stripe weekly `PRICE_IDS` are still empty TODOs (subscriptions/utils.py:14-26).
- **Signup-forward entry** — fresh installs land on /login with signup as a 13px footer link (routes/config.jsx:322-327, LoginPage.jsx:361-366); promote Create Account to primary CTA. Move Apple Sign In above the 7-interaction form, drop confirm-password (SignUp/index.jsx:205-216, 299-315).
- **Onboarding micro-cuts** — 2000ms mount delay → ~300ms (MobileApp.jsx:1048-1052); delete the no-op 'follow' interstitial.

---

## NEXT (after the current ad test settles)

### 9. Give the no-tape user a path to the aha *(the last-30-seconds leak · high · medium)*
- **Evidence:** TapeReview's only input is a file picker (TapeReview.jsx:413-433, "up to 500 MB") — no record option, no sample. The activation target (new actor from an ad) may have nothing to upload and exits via "Maybe later" (:396-403). The result renderer (:245-386) is pure data-driven JSX that would render a canned sample perfectly.
- **Change:** (a) "Record a take now" secondary CTA (capture input or handoff from the Practice recorder); (b) "See a sample review" rendering a hardcoded result tagged SAMPLE; (c) copy: "Record one right now or choose from your library" + "Uses 1 of your free tokens". First instrument `FIRST_REVIEW_OFFER_SHOWN → STARTED` drop-off to size the leak — the events already exist.

### 10. Self-Tapes library → analyzer bridge *(kills forced re-upload · high · medium)*
- **Evidence:** SelfTapes/index.jsx has zero Jericho references; users who uploaded tapes the natural way must re-upload the same 100MB file over mobile data. BE is 90% there — `SelfTapeReviewView` already accepts an `r2_key` and downloads server-side (views.py:1172-1218), just restricted to `tmp/tape-review/{user_id}/`.
- **Change:** "Get AI notes ✨" button per Self-Tapes row posting the tape's storage key (or a `self_tape_id` the BE resolves). Also upgrade the library empty state to sell the payoff (index.jsx:871-887 → Green Room pattern).

### 11. Make review notes durable *(retention on the aha itself · high · medium)*
- **Evidence:** History rows render a ChevronRight with **no onClick** (Jericho/index.jsx:554-594) while the BE stores full notes in `SessionLog.ai_feedback` with a detail endpoint the FE never calls (ai/urls.py:27). `job_id` lives only in memory (jerichoSlice.js:34-48) — if iOS kills the app mid-analysis, finished notes exist in the DB but read as "the feature ate my token."
- **Change:** Tappable History rows → `session-log/<id>/` through the existing result layout; persist pending `job_id` + idempotency key to localStorage and resume polling on mount.

### 12. Post-aha contextual upsell for everyone past Day-0 *(revenue · high · medium)*
- **Evidence:** FirstReviewPaywall renders only when `firstReview=true` (TapeReview.jsx:364-384); the ~142 existing users have `reader_onboarding_seen=true` and will never see it. NoTokensModal sells nothing — no price, no trial (NoTokensModal.jsx:39-41).
- **Change:** Reuse FirstReviewPaywall as a post-result upsell for any non-subscriber after every Tape Review / Compare Takes; rewrite NoTokensModal with the Plus price + trial pill (`getIntroOfferFor` exists in Membership). Monetize at demonstrated value, not at denial.

### 13. Audition deadline/callback reminder job *(solo-user retention · high · medium)*
- **Evidence:** `deadline`/`callback_date` captured but never read by any job (auditions/models.py:60, :99, :166); FE already routes `callback_reminder`/`audition_reminder` pushes (usePushNotifications.js:96-102); APScheduler infra exists (growth/scheduler.py). All nine live push triggers require a second human — with ~7 weekly actives the whole push system is dormant for real users.
- **Change:** Hourly `remind_audition_deadlines` command: slots due in 24h → "Your {project} tape is due tomorrow — record a take tonight." Drop the self-notification noise at auditions/views.py:78. Most career-relevant push an actor app can send, and it feeds the analyzer.

### 14. Shareable Jericho scorecard *(the UGC engine · high · medium)*
- **Evidence:** The result screen's verdict + Tape Scores + Performance DNA bars (TapeReview.jsx:245-386) render at peak delight with zero share affordance; `@capacitor/share` is installed and used (saveMedia.js:56, RecordTake.jsx:130-137).
- **Change:** Branded 9:16 card (scores + one tone tag + referral link baked in; coaching notes stay private) via the existing share path. Compounds with the fixed referral wire (#6). Second template later for Compare Takes ("AI ranked my takes — which would YOU pick?").

### 15. Empty-state pack *(polish batch · medium · small each)*
- Audition Tracker: five empty columns saying "Drop here" (Auditions/index.jsx:297-301) → ghost example card + "Log your first audition"; mobile empty text made tappable (MobileApp.jsx:2073-2075).
- Practice tab: "YOUR SCRIPTS" header over nothing (MobileApp.jsx:2493, :2533) → zero-state with "Generate a practice scene with AI" primary (the generator is checklist step 2 yet buried in More, :896).
- Web: no Tape Review nav entry anywhere — hidden behind "My Growth" (sideMenuConfig.jsx:51-55; the code comment claiming a sidebar link is stale) → dedicated sidebar item + Quick Access tile → `/dashboard/jericho?tab=tape`.

---

## LATER (bigger bets)

### 16. Weekly craft digest from data already on disk *(reaches the 142 dormant · high · medium-large)*
- `memory_context.py` (Performance DNA, growth areas, "the_one_thing") and Monday rank trends (snapshot_leaderboard_ranks.py) are computed and shown to no one outside the app. Monday push: "rank ↑3 · Jericho's focus for you: {growth_area}"; 0-session variant: "Jericho remembers your last tape — ready for take two?" The only loop that reaches dormant signups with something personal.

### 17. Lifecycle email *(safety net under every push loop · medium)*
- The entire email surface is `helpers/temp_smtplib_email_server.py` (login OTP only). Wire Resend/Postmark; ship D0 welcome (free-review CTA), D2 "you haven't gotten your casting notes" (signups with 0 AnalysisJobs), D7 personalized win-back from memory_context. This is the *only* channel for push-deniers.

### 18. Streak unification + defense *(medium)*
- BE `UserStreak` (growth/models.py:82-93) vs the visible localStorage-only Aurora streak (gameStore.js:3,37,53) is split-brain — reinstall wipes it. Make BE the source of truth, then add the evening "streak ends at midnight" push on the existing scheduler.

### 19. Small virality residue
- Share text + URL ("Taped with Dr Self Tape" + referral link) alongside exported videos (RecordTake.jsx:121-139) — never watermark the video itself (casting-hostile); post-export "Get AI notes on this take" prompt.

---

## Sequencing logic
NOW items 1-8 are all small-effort and together rebuild the funnel end-to-end for the current ad spend: *found → free → uninterrupted → notified → durable → paid → shared*. Treat items 3+4+13+16 as one **"solo loop" epic** (per the retention lens): until network density exists, every re-engagement dollar goes to triggers a user can earn alone. Measure everything through the already-wired PostHog `FIRST_REVIEW_*` funnel plus the new referral/share events — the instrumentation gap (#6) is what makes the ad test readable at all.