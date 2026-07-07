# DST Activation Strategy — 2026-07-07

*Built by a 13-agent swarm (5 research lenses + 4 codebase-grounding agents + Codex weigh-in → synthesize → adversarial critique → finalize). The critique and Codex materially changed the plan — both are preserved at the bottom.*

---

## The uncomfortable headline

**"Turn 70% of the 169 signups active" is arithmetically dead, and I'm killing it as a target.** ~161 of the 169 are already-churned curiosity tourists, students, and non-actors with no live auditions. You cannot resurrect a majority of them, and chasing that number manufactures guilt-mechanics that churn the *real* actors. The "70%" only ever survived because it was never anchored to a denominator.

Pick the denominators and the honest ceilings fall out:

| Metric | Denominator | Today | Honest ceiling |
|---|---|---|---|
| **First-review completion** | new, well-targeted cohorts | unknown | **~30–40%** (consumer-mobile avg ~8%, best-in-class SaaS 60–65%; this is an episodic pro workflow) |
| **Weekly-active share** | the **LIVE** base (opened app in window), never all 169 | ~5% | **~15–25%** (a 2–3 quarter goal, contingent on segment-focused acquisition) |

**Horizon: ~90 days** to confirm the flow is live, instrument the funnel, learn who the 8 lovers are, and lift new-cohort first-review completion toward 30–40%.

---

## The one finding that dwarfs everything else

**The entire Day-0 free-review activation flow may be silently DORMANT in production.** The gate `VITE_FIRST_REVIEW_FLOW` is confirmed **off-by-default and gitignored** (`AuroraOnboarding.jsx:28`; the flag lives only in `.env.local`). `.env.production` is empty. If the Vercel web build and the iOS build-time env don't set it to `true`, **every new user is dumped to Home and never sees the aha** — making every other intervention moot.

Additionally confirmed:
- **Web free-first-review is fully DEAD** — `Jericho/index.jsx:737` mounts `<TapeReview/>` with no `firstReview` prop. The offer→aha→paywall flow is mobile-only; web signups never see it.
- **Upload-only dead-end**: the free review only accepts an existing video file (`TapeReview.jsx:644`). A brand-new actor from an ad with no tape on their phone hits a wall at the file picker **at the exact aha moment**. This is the biggest structural leak.
- **The "your notes are ready" push is never sent** — the shipped iOS bundle already deep-links `tape_review_complete` to the tab, but the backend never fires the push. (`send_notification` doesn't exist in the FE repo — this is BE work.)

---

## Activation metric (crisp definition)

**ACTIVE = a signup who (1) completed their FIRST Tape Review, ever (untimed) AND (2) came back and completed a SECOND Tape Review.**

- **Drop the "within 7 days" anchor** — it punishes the exact working-actor whose next audition is 3 weeks out. The aha is a *lifetime* event, not a stopwatch.
- **Tighten "repeat" to a second review**, not "any AI action" — a stray tap on the reader is not activation.
- **Report two denominators, never one blended number:** (A) first-review completion among new cohorts, (B) weekly-active share of the *live* base.

## The aha (and the trap in it)

The aha is **casting-grade notes on the actor's OWN self-tape** — the one thing in an actor's life that answers back after they submit into the void. It resolves the **feedback-vacuum fear** ("am I even in the ballpark?").

**But the emotion was mislabeled as pure pride.** For a rejection-saturated, imposter-prone audience, a blunt first verdict can land as *"your instinct was WRONG"* and **engineer churn AT the moment of value.** The aha is only pride if the *first* verdict is paced honest-but-safe (see intervention #7). Also: that Tape Review is THE aha is a **leading hypothesis** on a tiny base (28/56 AI actions across 5 users) — confirm it by talking to the 8 actives *before* plumbing around it.

---

## Do these THREE NOW (weeks 0–2) — the no-regret set

A solo founder juggling App Store, ads, Academy, and ClearSlate has ~2–3 real slots. These three either unblock the aha or tell you whether the aha even matters:

### 1. Verify + commit an env-overridable `true` default for `VITE_FIRST_REVIEW_FLOW`
Verify Vercel web **and** iOS build-time env actually set it (watch the `"true\n"` env landmine). Then make the in-code default read `true` unless explicitly overridden — **env-overridable, not hardcoded** (keep a kill-switch). FE-only, rides the next iOS build.
→ *Measure:* PostHog `offer_shown` fires for ~100% of new signups on web + iOS.

### 2. Instrument the signup→first-review funnel — **client-side PostHog only**
Emit `offer_shown`, `consent_declined_at_offer`, `tape_in_hand`, `review_started`, `review_completed`, `notes_viewed`, `second_review_started` — plus the two silent aborts (consent declined at handoff `~1001–1039`; upload form opened, no file picked). Guard the two known traps: WKWebView CORS-custom-header silent block, and PostHog bot skew. Stays NOW by skipping cross-repo BE server events.
→ *Measure:* a readable funnel chart exists; the single largest step-drop is named.

### 3. Interview the 8 weekly-actives + the 1 subscriber THIS WEEK
The 1-sub/169 reality is *also* a "who are these people" problem. Fire the Sean Ellis "how disappointed if you couldn't use this" survey + ask: how often do you audition, what made you come back, and (to the sub) what almost stopped you paying. **This gates ranks 6–11** — if the actives are novelty hobbyists, do NOT spend the quarter plumbing; the problem is ICP/acquisition, not activation. At N=8 this is 8 *interviews*, not a "magic number" — treat qualitatively.

**Plus two cheap FE copy fixes that ride the same bundle:**
- **#4** Move the iOS push-permission ask from cold app-mount to *after* the first reveal (`usePushNotifications.js` auto-subscribes at mount today — burns the one-shot permission before any value).
- **#5** Delete the fabricated "5× callbacks / 3% / 17%" rings from the paywall (trust risk with a scam-wary audience + Apple 2.3.1 exposure). Replace with the honest authority line: *"Built on a study of 110 real self-tapes."* Sell the transformation — *"Walk into every audition already knowing your tape lands"* — not "AI tokens."

---

## NEXT (weeks 2–8) — only after the interview says "these are real recurring actors"

| # | Move | Why | Effort |
|---|---|---|---|
| 6 | **Record-in-app** as the primary no-tape path (sample = explicitly-labeled FORMAT preview only, never a fake "result") | Ability is the bottleneck, not motivation; converts high intent to the REAL aha in one session. Cap free reviews/device — COGS on tourist traffic | med |
| 7 | **Psychologically-safe first verdict** — lead with a genuine strength, soften "the one thing," reserve the full scorecard for repeat reviews | Stops the aha from wounding a fragile first-timer | med |
| 8 | Fire the never-sent **"your notes are ready" push** (cross-repo BE: `apps/ai/jobs.py` `_finish_ok`/`_finish_fail` → register title → Railway deploy → APNs check → FE copy → new build → device test) | Transactional pushes open ~69%; turns a multi-min wait into a guaranteed return | med |
| 9 | **Post-reveal paywall** on result-dismiss for all non-subscribers, price/plan set from rank-3 WTP findings | Peak-end + reciprocity; Day-0 is when most purchases happen | med |
| 10 | **Boost the proven June-14 organic IG post** as a small paid ad → App Store page that now scent-matches | Don't run zero acquisition for a whole quarter; judge on cost-per-first-review-completed | low |
| 11 | **Endow the free review**, loss-framed, ONLY to engaged users (downgraded — don't nag the tape-less dormant) | Endowment fires only with intent/ability | low |

## LATER (weeks 6–16) — infrastructure once the new-cohort retention curve is readable

- **12. Per-audition event-triggered lifecycle** (BE): read the already-stored `deadline`/`callback_date`; T-24h / callback-logged / 10-days-idle triggers. Keep M/W/F blast only as a 2×/week fallback. **Ship WITH a global frequency cap** (~3/day, ~3–4 non-transactional/week) — over-messaging burns the one iOS channel that has no in-app recovery.
- **13. Durable, tappable, memory-aware review history** (RETENTION of the lovers, not activation) — BE stores full notes + Performance DNA + `the_one_thing` but FE never renders detail. Persist `job_id` so an app-kill mid-analysis never reads as "the feature ate my token."
- **14. Route empty states to the aha + add web Tape Review nav** (hygiene, low lift).
- **15. Resend D0/D2/D7 email channel** (BE) — the only channel surviving push opt-out + reinstall — **only build after rank 3 confirms the dormant include reachable actors**, else write the 161 off cleanly.

**HARD GATE:** do not increase Meta spend beyond the single proven-post test until the NEW-install weekly cohort-retention chart visibly flattens. Scaling before then just multiplies the 169→8 leak.

**Cut entirely:** the craft-rep streak. Gamifying controllable reps for rejection-saturated adult professionals risks the exact imposter-guilt churn we're avoiding.

---

## Top risks
1. **Whole plan is moot if the flag is OFF in prod** — verify FIRST, treat as a blocker.
2. **This may be an ICP problem masquerading as an activation problem** — rank 3 must run before ranks 6–11.
3. **Half of what looks "NOW" is cross-repo BE work** (push, server events, APScheduler, Resend) in the TCC-blocked, deploy-gated Railway repo — second-wave, not one-liners.
4. **The aha can WOUND** — ship the safe first verdict (7) alongside record-in-app (6) or widening the funnel just delivers more people to a fresh rejection.
5. **Trust is one-shot** with a scam-wary in-group — a fake "sample result," fabricated stat, or fake countdown permanently torches the loop.
6. **Free reviews to ad tourists have real COGS** at ~1/169 conversion — cap free reviews/device, count unit economics.

---

## Codex's independent take (contrarian points worth keeping)
- **The one move:** make the first Tape Review impossible to miss *and impossible to fail* — ungate the flag, put Tape Review before the paywall, add a "record now" fallback so no-tape users don't dead-end.
- **Disagrees with leading on lifecycle/push** — those are *return* mechanics; DST's problem is almost nobody activates in the first place. Better reminders just remind people about a product they never understood.
- **Skeptical Tape Review is definitely the aha** — "it drove half of last week's AI actions among 5 users" and "it is the aha" are different claims.
- **Biggest blind spot: the 70% target and the measurement.** With thin attribution + a possibly-dormant flag, you may be optimizing from anecdotes. Know where users drop before scaling tactics.

## Adversarial critic's verdict (verbatim)
> "Strong diagnosis, honest-for-a-strategy, and the top 3 moves are correct — but it oversells itself as a '$0, solo-shippable, mostly-NOW' plan when half the NOW phase lives in a separate, TCC-blocked backend repo, and it quietly keeps a 70% target it has already proven is impossible. This is a good MEASUREMENT-AND-UNBLOCK plan mislabeled as an activation plan… Ship ranks 1, 3 (FE-only), and 6 this week; promote 'talk to your 8 actives' into NOW; kill 70% as a number entirely."

---

*Source: workflow `wf_4fa0e864-f9f`. Full research lenses (conversion psychology, activation science, sales psychology, actor drivers, lifecycle) captured in the run transcript.*
