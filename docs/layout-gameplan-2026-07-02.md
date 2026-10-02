# Layout Game Plan — Morning Brief (2026-07-01)

## 1. Direct answer: is it a layout issue?

**Partially yes — and the five lenses agree on where.** All five returned "yes, plausibly suppresses engagement," but read them honestly:

- **What's unanimous (high confidence):** the Home screen is the problem, and specifically three mechanisms: (a) a ~890px **fabricated gamification stack** (localStorage "Rank #128," honor-system quests, a battle-pass) owning the prime fold above every money feature; (b) **Compare Takes having literally zero navigation presence** — 0 all-time uses is the layout's predicted output, not a demand signal; (c) **CTAs that lie** — the Home card promising "Rehearse with an AI scene partner" and the FAB's "Record take" both open cd-sim, not the scene partner or a camera. Five independent code-reads converged on the same lines of MobileApp.jsx. That's signal, not noise.
- **What the lenses explicitly did NOT claim:** that layout explains 4/151 weekly-active by itself. Lens 1 and Lens 4 both flag it as a *compounding* factor behind the known funnel-routing gaps (separate workstream) and the leaky-bucket activation problem. Several individual screens were graded as good or excellent (see §4).
- **The honest framing:** funnel-routing bugs determine whether users get *offered* the aha moment; layout determines whether users who open the app can *find and believe* it. Right now the layout actively works against discovery. Fixing it won't 10x activation alone, but not fixing it caps every funnel fix.

Caveat all five lenses gave: this is static JSX/CSS reading, the app wasn't run. Treat pixel-math claims as strong inference, verify on device before the sprint tier.

## 2. The layout thesis in one paragraph

The current Home screen says: *"This is a practice-streak game with a leaderboard, and somewhere below the fold there are some AI features."* It should say: *"Upload your tape, get casting-grade notes tonight — and here's your AI scene partner while you wait."* An actor who clicked an ad promising AI notes walks through a generic signup that drops the promise, a 10-screen data-collection onboarding, and lands on a screen where the first full viewport is fake XP, freeze tokens, and "Rank #128" — while the two features that actually retain the 4 active users (live scene: 27 uses, tape review: 13) sit at visual positions ~11 and ~16, and the third (Compare Takes) doesn't appear anywhere at all. The app's layout is a game *about* the app instead of the app.

## 3. Game plan

### Tier 1 — QUICK REARRANGE (ship in days; mostly deletions, reorders, renames)

| # | Change | Evidence | Expected effect |
|---|--------|----------|-----------------|
| 1 | **Kill the fake gamification stack from Home.** Delete/comment the 4 JSX lines at MobileApp.jsx L1183–1188 (AuroraHUD/Quests/StreakGuard/Season). Hide, don't delete the components — decide server-backed revival later. | Lens 1 F1, Lens 3 F2, Lens 5 F3 — fake Rank #128 from gameStore.js defaults, ~890px of prime fold | Reclaims the entire first viewport for real features; removes the trust tax of a provably fake rank one tap from the real leaderboard |
| 2 | **Tape Review hero → permanent position 1; Acting Coach card → position 2.** Delete the L1273 fallback slot; hoist L1544 above the (now-removed) stack. | Lens 1 F3 — "tape" and "AI" don't appear above the fold post-first-review | The two money features become the above-the-fold identity of the app |
| 3 | **Fix the two lying CTAs.** Point the "Rehearse with an AI scene partner" card (L1544→cd-sim) at the actual live-reader path; rewrite the cd-sim card copy to "Get coaching notes on your scene." Make the FAB's first action "Get tape notes" → setTab('tape-review') and fix "Record take" routing (L1723–1729). | Lens 2 F3, Lens 4 F6 | Users who tap the aha-feature promise actually reach the aha feature instead of "trying" it and bouncing |
| 4 | **Give Compare Takes three cheap doors:** MORE_FEATURES tile, a Home card ("Filmed 3 takes? AI picks the winner"), and a post-review "Compare this take against another →" CTA in the result view. Reuse the dst_first_review sessionStorage handoff pattern (L1020–1023). | Lens 2 F1 (unanimous across 4 lenses) | Moves Compare Takes from structurally-impossible to discoverable; the post-review CTA hits the exact moment the need exists |
| 5 | **Labels under all 7 tab icons** (10px, standard iOS); rename "Room"→"Chat", "Tape"→"Review". Full 5-tab restructure waits for Tier 2. | Lens 2 F5, Lens 4 F3 — 6 of 7 tabs are anonymous 40px glyphs | New users can decode the nav in session one |
| 6 | **Safe-area fix on LiveSceneMode** — paddingTop/Bottom env() insets + 44pt Pause/End buttons. One-file CSS. | Lens 4 F1 — the #1-used feature's controls sit under the home indicator | Protects the only feature currently retaining anyone |
| 7 | **Signup scent-match:** port login's visual language + restate "your first AI tape review is free" (SignUp/index.jsx L189). | Lens 5 F1 | Stops the promise-drop at the highest-intent moment |
| 8 | **Cold-start dark flash:** data-theme="light" on `<html>`, theme-color #FAFAF7, flip :root defaults. Three lines. | Lens 5 F5 | Removes the glitch-frame first handshake |
| 9 | **Delete the duplicate SlateTip** (L1191–1193) and gate AuroraPracticeStrip on having data (same hasStats pattern as L1269). | Lens 1 F5/F7 | Less zero-state noise mirroring users' own inactivity |

### Tier 2 — RESHAPE (one focused sprint; 1–2 screens redesigned)

| # | Change | Evidence | Expected effect |
|---|--------|----------|-----------------|
| 1 | **First-session Home variant: 5 blocks max.** Greeting → Tape Review hero → ONE guidance system (merge Smart Next Step + TutorialChecklist; delete Quests/DailyChallenge from Home) → practice strip → compact 2x2 "Explore" grid for teasers. One-accent rule: the hero gets the only gradient. | Lens 3 F1/F3, Lens 5 F4 — ~16–24 widgets, ~19 competing suggested actions, 22 gradients | Home becomes a workspace with one obvious next action instead of a promotional feed; the retention-correlated action (first review) gets the whole attention budget |
| 2 | **Cut onboarding to 3 screens** (name → free-review offer → notif-after-value); move profile/interests/goals/level into a post-first-review quest via the existing ProfileCompleteness card. | Lens 5 F2 — 12+ data points across ~10 screens pre-value | Removes 7 drop-off surfaces between ad click and aha moment |
| 3 | **Analysis wait state:** staged progress UI (Uploading → Watching → Writing notes) + persistent "Notes ready" badge on the tab bar read from Redux. | Lens 4 F4 — 3-min indeterminate spinner, zero re-entry cue after tab-away | The aha feature stops climaxing in a dead screen; users who wander off get pulled back |
| 4 | **Close the record→review loop:** resurrect SelfTapeRecorder.jsx (finished, ergonomically correct, currently dead code) as a PracticeV2 tab, with "Get AI notes on this take" handing the blob straight to reviewTape. | Lens 4 F2 — core loop currently requires leaving to the native camera app | The app's central promise becomes completable in-app; converts live_scene usage into tape_review usage |
| 5 | **5-tab bar:** Home, Practice, Review, Connect (Reader+Room merged), More — with the More screen regrouped using the web sidebar's AI STUDIO/PRACTICE/CONNECT sections (already proven fix, Sidebar.jsx L43 comment). | Lens 2 F4/F6 — two prime slots on structurally-empty community surfaces; 15-tile flat More grid | Nav stops advertising emptiness and starts routing to value; frees a slot |
| 6 | **Demo-scene deep link for the live reader** — "Try a sample scene" via the existing drst-load-virtual-script event, skipping the upload gate. | Lens 2 F2 — 5 taps + script-upload prerequisite before the aha | Cold-open-to-hearing-the-AI-read path finally exists |

### Tier 3 — RETHINK (only if Tier 1–2 data demands it)

- **Type scale + design-system sweep** (20 font sizes → 5-step scale, drop unused Anton/Bebas). Real debt, but zero users churned over an 11.5px font. Do it opportunistically during Tier 2, not as its own project.
- **Server-backed gamification.** If post-cleanup data shows the 4 actives miss the streak mechanics, rebuild ONE honest server-computed streak from /v1/growth/practice/week/. Do not rebuild the rank/league/battle-pass without real data behind the numbers.
- **Full IA restructure / panel-system rework.** No lens found the panel mechanics fundamentally broken (only the active-tab and "Feature"-label nits — fix those in Tier 1 spare time). Don't rearchitect.

## 4. What NOT to touch

- **The login page.** Lens 5 called it excellent and near word-for-word scent-matched to the ads. It's the bar the rest should rise to.
- **TapeReview and ScenesScreen internals.** Lens 3 explicitly: calm, well-structured, "proof the team can build the calm pro tool." The problem is reaching them, not being in them.
- **Tape Review's tap depth.** 1 tap from cold open — structurally fine (Lens 2). The tab just needs a label.
- **The web sidebar.** Already fixed with the AI Studio grouping; it's the template for mobile's More screen, not a workstream.
- **SelfTapeRecorder.jsx.** Don't refactor it — it's already correct. Just wire it in.
- **The gamification *code*.** Hide from Home, keep the components. Deleting forecloses the server-backed option.

## 5. Validation plan — before any big redesign spend

**Honest constraint first: with 4 weekly actives, A/B testing is statistical theater.** Anything split across 151 mostly-dormant users will never reach significance. So the plan is instrument → ship Tier 1 as a bet → measure the *next cohort*, not a controlled experiment.

1. **Instrument now (half a day, before shipping anything):** PostHog events for Home card taps (per-card id), Home scroll depth, gamification-stack taps vs money-feature taps, Compare Takes entry, live-scene "Go Live" reached, analysis-wait abandonment (tab-away during tapeReviewLoading). This creates the baseline the five Beta Launch funnels don't currently capture.
2. **3–5 days of baseline** while Tier 1 is being built. Prediction to falsify: gamification taps ≫ Tape Review hero taps, and near-zero scroll past position ~8. If baseline shows users already scroll deep and tap the hero fine, the layout thesis weakens — stop before Tier 2.
3. **Ship Tier 1 behind a simple env/flag for the Home reorder** (rollback lever, not an A/B).
4. **Re-invite the dormant 147** via the existing broadcast + What's New system after Tier 1 ships — they are the test cohort. Measure: first-session tap-through to Tape Review, first-review completion, any Compare Takes use (currently 0 — a single use is signal), D7 return.
5. **Decision gates:** Tier 2 sprint is justified if Tier 1 moves first-session hero tap-through or first-review completion meaningfully (directionally, e.g. >2x on the new-signup cohort — don't pretend precision at this n). If Tier 1 moves nothing, the bottleneck is upstream (ads → signup → onboarding funnel or the product promise itself) and the sprint money goes there instead.
6. **Cheap qualitative check:** 3–5 session replays (PostHog) of new signups post-Tier-1, plus one hallway test — hand a working actor the phone, say "get AI notes on a tape," time them. That's worth more than a month of underpowered metrics at this scale.

**Bottom line:** ship Tier 1 this week — it's mostly deletions and honest labels, near-zero risk, and every item is independently defensible even if the engagement thesis is wrong. Hold Tier 2 until the instrumented cohort confirms the layout was eating the funnel fixes' gains. Don't start Tier 3 on vibes.