# Mobbin Pattern Swarm → App Improvement Plan — 2026-07-28

8-agent workflow: 5 Mobbin research lanes (onboarding, paywalls, results/share, retention, home layout) + 2 code-state audit lanes on this repo + synthesis. All Mobbin claims are from examined screenshots; all file refs verified against current code. Full raw output: session task `wf8n184kj`.

Ranking is by expected impact on THE BET: first Tape Review in session 1.

## Ranked improvements

### 1. Put `first_review` at the top of TutorialChecklist — S, activation
Reorder STEPS so "Get your first AI Tape Review" is the first unchecked item, ahead of "headshot", with RECOMMENDED-style visual weight (Duolingo's pre-blessed default). The checklist is the sole guidance on firstSession Home — its top item IS the routing decision, and today it routes decliners to a profile task.
- Where: `src/components/Dashboard/TutorialChecklist.jsx:14-18`
- Evidence: Duolingo https://mobbin.com/flows/7d7aacbe-213b-471e-8b1f-b5b7087bcb65 · ElevenLabs empty state https://mobbin.com/screens/e5c263c5-f9e7-409f-b759-f60327b3a3a7

### 2. Port offer→firstReview→paywall flow to web/desktop — M, activation
Web signups never see the forced-first-review flow at all — a whole acquisition channel bypasses the bet. Mount `<TapeReview firstReview>` from Jericho when `tutorial_progress.first_review` is false; retire legacy ReaderOnboardingModal for new users; add a dedicated "Tape Review" sidebar item (currently hidden under "My Growth"). Reuses AuroraOnboarding offer step + FirstReviewPaywall.
- Where: `src/panels/Dashboard/Jericho/index.jsx:788`; `src/panels/Dashboard/Home/index.jsx:17,272`; `src/configs/sideMenuConfig.jsx:51-55`
- Evidence: Kino https://mobbin.com/flows/b32a3d13-e52d-48e6-8254-7be1bb85b237 · Duolingo (flow ends in DOING the action)

### 3. Offer step = two-card guaranteed win — M, activation
Exactly two cards: "Record our 30-second practice scene, get casting notes — RECOMMENDED" (deep-links bundled sample scene via `drst-load-virtual-script` straight into SelfTapeRecorder) vs "I have a tape / my own sides" (upload/BYOS). Both terminate at the analyzer. CTA: "Get my free review". Kills the two session-1 killers: "no sides" and "I look bad today". Plumbing already exists.
- Where: `src/panels/Onboarding/AuroraOnboarding.jsx:860-900`; `src/panels/Mobile/MobileApp.jsx:2864`; `src/panels/Dashboard/Jericho/TapeReview.jsx:905-918`
- Evidence: Duolingo two-card RECOMMENDED routing · Life Reset easy Day-1 win https://mobbin.com/flows/a91200b0-904c-4c1b-a69b-1526d90d4ae6

### 4. Camera/mic permission pre-sell interstitial — S, activation
One screen before first SelfTapeRecorder mount: framing-guide mock + "Your AI reader needs to see and hear you. Next screen, tap Allow twice and you're rolling." Then fire OS prompts. Denied cam/mic = unrecoverable session-1 kill on iOS. (Push soft-ask already done right; camera/mic isn't.)
- Where: `src/panels/Mobile/MobileApp.jsx:146` + new small gated component
- Evidence: Duolingo pre-sell https://mobbin.com/flows/2959b3ec-3a19-475e-82b4-47762857b3a4 · HelloFresh https://mobbin.com/flows/b8c24066-cf86-473e-b353-519ffa22782f

### 5. ⚠️ Verify the "notes are ready" push actually sends — M, activation
FE promises "close the app — we'll notify you" (`TapeReview.jsx:550`) and the notesReady tap-router exists (`MobileApp.jsx:3590-3594`). VERIFY the BE (`apps/ai/jobs.py`) sends APNs on AnalysisJob completion; if not, the copy is lying and everyone who backgrounds during the 1–3 min analysis is lost. Show a mock of that exact push in the onboarding notif step.
- Evidence: HelloFresh (show the actual notification) · Lapse pending-reveal deck https://mobbin.com/screens/8acb7f2d-ba66-4840-829c-fe8644d199d3

### 6. Stage the Tape Review reveal — M, activation
Replace wall-of-notes landing: (1) animated headline grade on a gauge with actor-native bands (Keep Taping → Callback → Book It), addressed by first name; (2) tappable segments (what worked / the one fix) with verdict chips ("Casting-ready", "Needs work"); (3) final segment IS the share card; "See your full casting notes" expands detail — where FullReadLocked/FirstReviewPaywall already sit. Use Emil animation skills + Aurora components.
- Where: `src/panels/Dashboard/Jericho/TapeReview.jsx:711-918`
- Evidence: Opal story recap https://mobbin.com/screens/403d27ac-0a46-4cdd-9e8e-a7521bbc8aee · Lifesum gauge https://mobbin.com/screens/c59f1090-e05b-48b8-b694-a164780377db · Spotify Wrapped https://mobbin.com/screens/9f826cdd-afb0-4c1f-b50c-29cba57659e1

### 7. ⚠️ Fix the share card — M, acquisition/viral
**Footer currently links drselftapes.com — the STUDIO site, not the app.** Bake "DR SELF TAPE — free tape review" + App Store attribution into pixels; lead with identity claim ("Callback-ready") over verdict quote; 9:16 IG Story variant first in destinations; microcopy "Tag @dr.selftape — we repost the best tapes weekly"; bonus review credit on share. Only organic acquisition surface in the app.
- Where: `src/panels/Dashboard/Jericho/TapeReviewShareCard.jsx` (footer link = S-size must-fix now); reconcile later with ~/dst-report-card Remotion asset
- Evidence: Spotify (URL in pixels) · Duolingo identity claim https://mobbin.com/screens/a5a8ecd0-6dfe-4dba-b758-8bf952083182 · Uxcel Go repost promise https://mobbin.com/screens/a849139b-8acf-4bd6-9046-3d9ee8381db5 · Runna destinations https://mobbin.com/screens/0d8088e6-2e9f-4bc7-8cbe-7ab42a1b9e4d

### 8. Post-review upsell for returning free users + honest NoTokensModal — M, monetization
Highest-intent moment (just read an AI critique of their own tape) currently ends with no ask for non-first-review users. Drop the firstReview-only gate; show AllTrails-style Free vs Premium checkmark matrix (Headline ✓/✓ · Deep-read ✗/✓ · Compare Takes ✗/✓ · Unlimited AI reader ✗/✓). Rewrite NoTokensModal to concrete plan+price+"Try for $0.00". Align emitted event names with PostHog funnel defs while in there.
- Where: `TapeReview.jsx:799-801`; `src/components/NoTokensModal.jsx`; `src/utils/goUpgrade.js`
- Evidence: AllTrails matrix https://mobbin.com/screens/0e508882-f772-497d-959e-d51095983ef1 · Blinkist post-investment paywall https://mobbin.com/flows/a9e95e3d-961b-422b-b217-d3fe6fe34e0f · Sunlitt "$0.00" https://mobbin.com/flows/917b11e2-a362-4d82-8cc4-f62a4b81419a

### 9. Self-Tapes library → analyzer bridge — S, activation
"Get Tape Review" button on every library row, handing the existing tape into TapeReview (same sessionStorage handoff as `dst_compare_takes`) — today users must RE-UPLOAD to get notes on a tape already in the app.
- Where: `src/panels/Dashboard/SelfTapes/index.jsx` (zero Jericho refs today); handoff pattern at `MobileApp.jsx:949-951`
- Evidence: Halide last-capture bridge https://mobbin.com/screens/414b9a96-fb87-4ff6-b21d-63d682f3e792 · Canva recents https://mobbin.com/screens/2fe16303-479e-4a70-b8e1-cd544a1780e4

### 10. Takes deck with review-status badge beside the record button — M, retention
Pin most-recent take thumbnail beside record; stack takes-awaiting-review as a badged deck ("2 reviews pending") opening the staged reveal; at 2+ reviewed takes offer Compare Takes there. The real gamification loop replacing the removed fake one; puts Compare Takes one tap from where takes are born.
- Where: `MobileApp.jsx:146,2755`; pending-job state already in `src/redux/features/jericho/jerichoSlice.js`
- Evidence: Lapse developing deck · Halide shutter thumbnail

### 11. Trial-anxiety paywall pack — M, monetization
In-card trial timeline ("Today: unlimited reviews free · Day 5: we remind you · Day 7: $X/mo"), two-line CTA ("Start your free 7-day trial" / "then $9.99/mo"), pre-checked "Remind me before trial ends" toggle on existing APNs plumbing, "Cancel anytime" under button. Needs trial-enabled products in ASC/Stripe. Real numbers only ("N tapes reviewed").
- Where: `src/panels/Dashboard/Membership/index.jsx`; FirstReviewPaywall (`TapeReview.jsx:38`)
- Evidence: Blinkist timeline · informed News in-card https://mobbin.com/screens/42971508-bf98-445c-a8dd-790aadb50678 · Rise reminder toggle https://mobbin.com/screens/0d99f85c-127f-43eb-8bf6-52c2190e607f

### 12. Flip dormant weekly tier as deliberate anchor — M, monetization
Create weekly Stripe/ASC/Play products at display prices (4.99/6.99/9.99), set `VITE_WEEKLY_ENABLED=true`, Duolingo layout: monthly/annual under "FREE TRIAL" (monthly pre-selected MOST POPULAR), weekly under "NO FREE TRIAL" at the deliberately ugly per-week rate. Anchor effect likely lifts monthly even if nobody buys weekly. Flip checklist in `project_weekly_and_first_review` memory.
- Where: `Membership/index.jsx:20-24`
- Evidence: Duolingo anchoring https://mobbin.com/flows/92978b58-fc8c-4923-bbdb-a6c97d0e5513

### 13. Weekly taping streak + auto "Dark Week" freeze — L, retention
"Taping Streak: N weeks" (≥1 tape or review that week); day dots only as 3-state calendar (taped / practiced / neutral — never red); one auto-applied Dark Week pass/month ("No sides this week? Your streak is safe"); milestones at 2/5/10 weeks paying a free deep-read credit. Daily grain punishes casting-cycle clumps.
- Where: `MobileApp.jsx:516-561` streak header; BE growth app (current_streak_days → weekly + freeze); DailyChallengeCard
- Evidence: Open week streak https://mobbin.com/screens/397638da-c645-4335-bfe2-349a9d62abd8 · Paired auto-freeze https://mobbin.com/screens/8c5c1887-ad4d-46fe-ac18-2db716b35c72 · MacroFactor neutral calendar https://mobbin.com/screens/c3669dff-8bd1-438c-abe6-280508ecd1dd · Duolingo milestone tooltip https://mobbin.com/screens/b7578a37-b5f0-4921-a9c2-3b42bad94eb9

### 14. Personal records on results screen — M, retention
Track per-actor bests across reviews (best overall, best per rubric dimension, first A-, …); render new records as a named list ("New personal best: eyeline") with share CTA beneath. Makes review #5 as motivating as #1. Data already exists in review scores.
- Where: `TapeReview.jsx` results + TapeReviewShareCard; BE aggregation (My Growth already computes score history)
- Evidence: Fitbod records reframe https://mobbin.com/screens/3dd91c2f-775c-4c36-a851-62ad6e45f50e

### 15. One-time win-back on paywall dismissal + dormant-user broadcast — M, monetization
On paywall close after a review: one-time full-bleed "50% off your first month — close this and it's gone." Reuse same offer as broadcast (push + announcement banner) to ~190 dormant users. Stripe coupon / ASC offer.
- Where: paywall dismissal handlers in TapeReview + Membership; broadcast system per `reference_broadcast_system`
- Evidence: Sunlitt win-back https://mobbin.com/screens/0c960695-73aa-4a20-ac28-86648ddf5246

## Ideal session-1 flow (install → shared report card)
1. Install → login screen → "Create an account" → Apple Sign In + Face ID (shipped).
2. Onboarding 1: first name only, progress bar.
3. Onboarding 2 (offer): two cards — record 30-sec practice scene (RECOMMENDED) vs own tape/sides. CTA "Get my free review"; quiet "Not now". Both terminate at analyzer.
4. AI-consent accept (shipped, Apple 5.1.1).
5. Camera/mic pre-sell interstitial → OS prompts.
6. Record the bundled 30-sec scene (or upload).
7. Staged progress (Uploading → Watching → Writing) + "close the app, we'll notify you" backed by a REAL push (verify #5). Notif soft-ask shows mock of that exact push.
8. Reveal: animated gauge grade, actor-native bands, addressed by first name.
9. Tap-through: what worked → the one fix, verdict chips per rubric row.
10. Final segment = share card (identity claim, App Store attribution in pixels, IG Story first, tag-us repost promise, bonus credit on share).
11. "See your full casting notes" → FirstReviewPaywall: free headline visible; deep read behind matrix + trial timeline + "Try for $0.00" + reminder toggle.
12. On dismissal: one-time 50%-off first month.
13. Home: Next Take Mission seeded from their #1 note; checklist advances to "Compare 2 takes"; takes-deck badge shows the reviewed tape.
14. Later: notes-ready / M-W-F nudge pushes return them; the IG report card a friend saw is the acquisition end of the same asset.

## Do NOT do (considered and rejected)
- **Daily streaks / 7-day challenges** — actors tape 2-3x/week in clumps; daily guilt churns. Weekly grain + auto-forgiveness only.
- **Pre-auth recording / try-before-signup** — Apple AI-consent gate + account-bound AnalysisJob idempotency + token plumbing make it a structural rebuild. Revisit only if PostHog shows drop-off specifically at signup after the cheap fixes ship.
- **Calm-style blurred-result signup gate** — same rebuild in different clothes.
- **Long diagnosis quiz before the aha** — every screen before the record button works against the bet; 3-screen onboarding is an asset. At most one mirror-back line on the offer card.
- **Hold-to-sign vows / commitment rituals** — tone mismatch, extra screen.
- **Reviving fake gamification / localStorage RPG stats** — removed for cause (7/02 audit). A server-backed "Craft Rating" from real review scores is a fine future L-build.
- **Another tab-bar restructure** — 5-tab labeled bar with Review highlighted just shipped; churning nav confuses the existing ~200 users.
- **Partner-loss cancellation flows** — ~7 weekly actives; churn-save machinery before activation is the wrong bucket.
- **Press bars / "Join 1 million" social proof** — fabricated stats were just scrubbed for honesty; real numbers only.
- **Strip-everything empty states hiding all navigation** — breaks Green Room discovery, invites Apple review friction.
