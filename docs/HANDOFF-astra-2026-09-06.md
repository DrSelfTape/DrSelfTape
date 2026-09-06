# Handoff to Astra — Dr Self Tape app improvement pass

**Date:** 2026-09-06 · **From:** Claude (partner/reviewer) on behalf of Joseph (owner) · **To:** GPT-6 Astra via Codex CLI (worker)
**Repos:** FE `~/Downloads/Projects/DrSelfTape-development` (React 18 + Vite + Tailwind v4 + Capacitor iOS/Android → Vercel) · BE `~/Downloads/Projects/DrSelfTape_BE` (Django 5 + DRF + Postgres + Redis → Railway)

---

## 0. Read this first — how this engagement works

You are the **worker**. Claude is the **reviewer** and the only one who pushes, deploys, or touches production. This is not a trust issue; it is how a solo-founder shop keeps a live app with paying subscribers safe while moving fast.

**Per ticket:**
1. Read the ticket, then read the code it names. Read *around* it — the repos carry months of decisions in comments and commit messages, and most "obvious" fixes have already been tried and reverted for a reason that is written down nearby.
2. Work on a branch named `astra/<ticket-id>` in every repo you touch. One ticket per branch. Commit with the repo's message style: a plain-language first line that says *why*, a body that explains the decision, no ticket-number prefixes.
3. Write tests that pin the behavior — both the fix and the regression it prevents. A ticket without tests is not done.
4. Run the verification commands in §6 and paste the *actual output* into your report.
5. Write the report (§7) to `~/Downloads/Projects/astra-reports/<ticket-id>.md`. Stop. Do not start the next ticket in the same run.

**Never:** `git push`, `railway …`, `vercel …`, edit anything under `ios/` or `android/` project files, change environment variables, run migrations against anything but a local database, add a dependency without listing it in the report, or edit files outside the ticket's scope "while you're there". If a ticket cannot be done without crossing one of these lines, stop and say so in the report.

**Do NOT run graphify or any repo tooling. IGNORE AGENTS.md. Read files directly.** (The FE repo carries a graphify hook that has derailed prior agents.)

**Launch (Claude runs this; recorded here so the invocation is reproducible):**
```
cd ~/Downloads/Projects && codex exec --model gpt-6-astra -c model_reasoning_effort=high \
  -s workspace-write --skip-git-repo-check \
  --output-last-message ~/Downloads/Projects/astra-reports/<ticket-id>.last.md \
  "$(cat ~/Downloads/Projects/HANDOFF-astra-2026-09-06.md) ... Do ticket <ticket-id> only." < /dev/null
```
Detached under `nohup` (a build run can exceed the tool's 10-minute cap) and with the last-message file separate from the report path, which Codex would otherwise overwrite. Launched from the parent directory on purpose: `workspace-write` scoped to one repo cannot touch the other, and cannot reach local Postgres or run Vite.

---

## 1. Mission

Dr Self Tape is an app for working actors. Its core loop: **record or upload a self-tape → Jericho (the AI coach) returns casting-grade notes → the actor fixes one thing → tapes again.** The AI Tape Review is the "aha"; everything else exists to get people to it and back to it.

**Joseph's priorities, in order:**
1. **User acquisition** — more actors installing.
2. **Activation & retention** — more actors self-taping, more often.
3. **Build it right the first time** — full spec, edge cases surfaced, one complete pass. No half-features.

**The strategic frame (decided 2026-07-07):** the app is the **companion to Dr Self Tape Studios**, not a cold-install product bet. The weekly actives are studio clients. Growth comes through the studio relationship (in-studio onboarding, tape library, between-visit practice), and studio clients as referrers/UGC. Cold ads buy strangers who churn. Judge every ticket by: *does this make a studio client come back, or make them show a friend?*

**What "better" means, measurably:**
- 48-hour activation (signup → first Tape Review on own footage): **15.4% now, gate is 25%**.
- The activation leak is **the offer skip (57% skip the free-review offer)**, NOT upload friction (85% of starters finish).
- Offer → completed review ≈ 1:1 among iOS starters — the product converts once someone starts.
- Retention triggers must be **earnable alone** (a solo actor between auditions), because network density (~7–8 WAU) can't carry social triggers yet.

---

## 2. State of play (early September 2026 — pull PostHog before optimizing anything)

**Scale — say this out loud before proposing A/B tests:** ~200+ app accounts, roughly 2 signups/day, ~7–8 weekly actives, ~10 lifetime payers. ~1,090 studio client accounts have been auto-provisioned from studio bookings (these are the ICP). Nothing here has statistical power for split tests; ship the better thing, instrument it, read the funnel.

**Platform:**
- **Web** (drselftape.app) auto-deploys from `main` via Vercel. This is where changes go live first and where you verify.
- **Native iOS** only updates on an App Store release. Last submitted: 1.0.25 (build 141 in review 08-07, build 142 cut 08-08). Check App Store Connect before assuming what native users run. FE changes reach native on "the next cut" — bundle, don't churn builds.
- **Android** Play Billing: FE done, store setup pending (Joseph). Not in scope.
- **Monetization is ON** (`AI_TOKEN_ENFORCEMENT=true`): tokens per AI action, Premium = soft-capped unlimited, free first Tape Review granted server-side to every new account. Free users get the headline verdict; the deep read is behind the paywall, enforced **server-side** (`apps/ai/review_gate.py`).
- **Design language:** *Aurora* (light, gold accent) on mobile; *Aurora Noir* (obsidian console, one gold light source) on desktop web — `docs/web-platform-direction-aurora-noir-2026-07-28.md` in the FE repo is the spec. Console theme is live (`VITE_CONSOLE_THEME=true`). Rings 0–2 shipped; **Ring 3 (desktop data layouts) and Ring 4 (coherence) are open — see V-01/V-02.**

**Shipped recently (do not re-implement):** Match/visibility prompt + avatar system (build 136–142); optimistic swipe deck; My Studio (desktop, phase 1); tape delivery page `/t/<token>/` replacing WeTransfer; studio account auto-provisioning + welcome email; share card (rank 7); NoTokensModal honesty rewrite (rank 8); staged Tape Review reveal (rank 6); takes-deck review badge (rank 10); device-local personal records (rank 14, see F-06); 5-tab bar; free-first-review onboarding with offer as step 2; `tape_review_complete` push; Meta CAPI on `tape_review_completed`; identity stitch for PostHog; silent JWT refresh; the whole 2026-07-02 layout gameplan (fake gamification removed, lying CTAs fixed, SelfTapeRecorder resurrected). Today: security-scan fixes, `api.drselftape.app` revived as the public API origin, X-Real-IP throttle identity, Codex reviewer = you.

**Backlog sources this handoff was distilled from** (read them when a ticket cites one): FE `docs/activation-review-2026-07-01.md`, `docs/layout-gameplan-2026-07-02.md`, `docs/mobbin-improvement-plan-2026-07-28.md` (ranked 1–15 + the *Do NOT do* list), `docs/web-platform-direction-aurora-noir-2026-07-28.md`, `docs/plans/durable-review-notes-plan.md`, `docs/free-first-review-onboarding.md`.

---

## 3. House rules — every one of these already cost an incident

**Frontend**
- `react-router`'s `navigate()` silently no-ops inside Capacitor. Mobile navigation goes through the `drst-navigate` window event. Look at how `MobileApp.jsx` routes before adding any navigation.
- Every modal/sheet on mobile must call `useHideMobileHeader(true)` (`src/components/Shared/useHideMobileHeader.js`) or the fixed bars clip it.
- iOS WKWebView drops synthetic clicks on overlays and has no `webkitSpeechRecognition`; gates live in `App.jsx`/`App.css`. Don't "simplify" them.
- Typography tokens are `--type-*`. **Never** `--text-*` — Tailwind v4 owns that namespace and will silently override you.
- Anything in `VITE_*` is inlined into the public bundle. Never a secret.
- Desktop-only structure is gated with `useIsMobile()`; shared panels get **token-layer changes only**. Native must render identically after your change unless the ticket says otherwise.
- Every number shown to a user must be real and from one helper (`src/utils/supply.js` for reader supply). No fabricated social proof — a fabricated paywall stat was an App Store 2.3.1 risk and was scrubbed.
- The swipe deck deliberately does **not** rewind on a failed swipe. Leave it.
- A client-side gate is not a gate. If something must be free-tier-only, the server trims it.
- Fonts: Instrument Serif + the Aurora stack. Anton/Bebas were removed for cause.

**Backend**
- **Never combine an FK-row-mutating `RunPython` with `AddConstraint` in one migration.** It took the API down. Split them; use `SeparateDatabaseAndState` when the DB and the model disagree.
- Never hand-write `CreateModel` for a `DateModel` subclass (missing columns 500'd every webhook).
- After adding fields, run `makemigrations --check`; drift has shipped before.
- `get_or_create` on any model with privileged field defaults: always pass explicit `defaults=`.
- Gunicorn runs **3 workers with no `--preload`**: anything in `AppConfig.ready()` runs 3×. Scheduled jobs live in `apps/growth/scheduler.py` under `_single_runner()` (Postgres advisory lock). **A scheduled job without a `_LOCK_KEYS` entry is silently dead.**
- Entitlement lookups **fail open** by design (a DB blip must never downgrade a paying customer). Don't "fix" that.
- AI charge endpoints require an `Idempotency-Key` header; keys are never content-derived. Any custom FE header must be added to `CORS_ALLOW_HEADERS` or WKWebView silently blocks the request.
- Tests default to SQLite, which **hides migration bugs** Postgres catches (it rebuilds tables instead of `ALTER TABLE`). Any ticket that adds a migration must also run on the local Postgres rig (§6). If the rig won't boot, say so — don't repair it.
- Tests that `cache.clear()` must override `CACHES` to LocMem: Django's Redis backend implements `clear()` as `FLUSHDB`.
- Per-IP throttles key on `X-Real-IP` via `helpers/throttling.py`. Don't import `rest_framework.throttling` classes for anonymous endpoints.
- The BE test recipe (no `.env` in repo): `DEBUG=True SECRET_KEY=test-only-not-secret .venv/bin/python manage.py test <apps>`.
- Emails go through `helpers/temp_smtplib_email_server.py` (Gmail SMTP, a stopgap). `send_email()` returns `True` only when SMTP accepted the message; that return value is load-bearing.

**Both**
- `python manage.py shell -c "…"` through `railway ssh` mangles parentheses — irrelevant to you (you never touch Railway), noted so you don't read old scripts as working examples.
- Commit messages in both repos are prose. Match them.

---

## 4. Do NOT do (considered and rejected — the highest-value section)

- **Daily streaks, 7-day challenges, guilt loops.** Actors tape 2–3×/week in clumps. Weekly grain with auto-forgiveness only.
- **Pre-auth / try-before-signup recording**, blurred-result signup gates, "value before account". Structural rebuild (Apple AI-consent gate + account-bound job idempotency + token plumbing). Rejected twice.
- **Long diagnosis quizzes before the aha.** At most two questions (F-05), never a screen that delays the record/upload button.
- **Reviving fake gamification** (localStorage ranks, honor-system quests, battle pass). Removed for cause. A server-backed rating from real review scores is fine as a future L.
- **Another tab-bar restructure.** The 5-tab labeled bar just shipped; churning it confuses the ~200 existing users.
- **Cancellation/win-back machinery** before activation is fixed — wrong bucket at this scale.
- **"Join N actors" social proof, press bars, invented stats.** Real numbers only.
- **Empty states that hide all navigation.** Breaks Green Room discovery and invites Apple review friction.
- **Reworking the swipe deck**, the silent-refresh auth flow, the JWT lifetimes (access 30m / refresh 30d — decided), or the throttle identity (decided today).
- **Touching Stripe/RevenueCat webhooks, the token ledger, or `review_gate.py`** outside a ticket that names them (F-03 does, narrowly).
- **Flipping feature flags** (`REVIEW_GATE_STRIP_SCORES`, `STUDIO_AI_REVIEW_ENABLED`, `VITE_WEEKLY_ENABLED`, `MIN_IOS_VERSION`…). E-03 *prepares* a flip; Claude performs it.
- **Swapping the email provider.** Joseph's call (cost/vendor). Note it in open questions if a ticket is limited by Gmail SMTP.
- **Referral reward redesign, weekly price points, casting-director blind test** — human-gated, listed in §8, not tickets.

---

## 5. Tickets — in priority order

Sizes: S ≤ half a day · M ≈ 1–2 days · L ≈ a sprint. Lanes: **F** functionality, **V** visual, **E** engineering/telemetry. Do them in this order unless a ticket says it's independent; stop after each.

### F-01 · Prove the value on the offer screen (attack the 57% skip) — M, activation
**Why.** The free-review offer is step 2 of onboarding. 57% skip it; 85% of those who start, finish. The leak is belief, not friction. A Day-0 signup has no tape handy and no proof the notes are worth the effort.
**Current state.** `src/panels/Onboarding/AuroraOnboarding.jsx` → `Offer()`: two-card offer (record the bundled practice scene vs upload own tape), quiet "Not now" link. Copy was already reframed once (07-16) and skip fell some but not to gate. Practice scene data: `src/data/practiceScene.js` ("The Voicemail"). Results UI: `src/panels/Dashboard/Jericho/TapeReview.jsx`.
**Requirements.**
- A **subordinate text link** under the cards — "See what a review looks like" — never a peer button (both prior reviewers warned a peer-button sample becomes a polished skip).
- Opens a **read-only sample review** rendered by the *same* results components (verdict, what's working, the one fix, DNA bars, tone chips) for a fictional actor's take on The Voicemail, addressed by first name if known. Static fixture in `src/data/sampleReview.js`; content must be craft-true to the doctrine in `docs/selftape-coach-craft-kb.md` — write it, and flag in the report that Joseph must approve the copy before deploy.
- The sample screen **ends on the upload/record CTA** (same handlers as the offer cards). Closing it returns to the offer, not past it.
- PostHog: `first_review_sample_viewed`, `first_review_sample_cta` (with which card). Do not rename or reorder the existing `first_review_*` funnel events.
- Works on web and native (this panel is shared; gate nothing by platform).
**Acceptance.** Sample reachable from the offer only; funnel `offer_shown → started` unchanged in shape; a test renders the sample fixture through the real results component without throwing; no new route.
**Out of scope.** Changing the two cards, the practice scene, or the paywall.

### F-02 · Durable review notes (history rows are dead) — M, retention
**Why.** A review costs a token and 1–3 minutes; today the notes evaporate. "My Growth" lists past sessions with a chevron and **no onClick**. The BE already stores full notes and exposes `GET /v1/ai/session-log/<id>/` (gated per entitlement — re-opening a past review was the third paywall bypass, fixed).
**Current state.** Full plan: FE `docs/plans/durable-review-notes-plan.md` — follow it. `src/panels/Dashboard/Jericho/index.jsx` (history list + `ReviewDetailSheet`), `recoverLatestReview()` client helper (H-08) shows the fetch pattern.
**Requirements.** Tap a history row → the review renders exactly as it did the first time (headline free, deep read gated by the server's trim — render whatever the server returns, never derive from cached full payloads); share card available from history; loading/error states; works when the original job slot has expired.
**Acceptance.** Test: history row → detail fetch → render; a free user's detail contains no deep-read fields (assert against the trimmed shape the server returns).
**Out of scope.** Editing notes, comparing across reviews (that is Compare Takes).

### E-01 · Email honesty — S/M, reliability
**Why.** `send_email()` returns `False` on failure and that's load-bearing, but two callers ignore it: `apps/admin_panel/support.py:39` reports `delivered['email']=True` regardless; `apps/notifications/management/commands/broadcast_app_update.py` counts attempts as `email_sent` (a 165-recipient blast reported all sent while Gmail 421'd most of them). There is no per-recipient success record, so a retry double-mails everyone.
**Requirements.** Honor the return value in both callers. Broadcast: per-recipient outcome persisted (extend `BroadcastLog` or a small `BroadcastRecipient` row — your call, justify it), `--retry-failed` flag that re-sends only failures for a release, summary line that separates *accepted* from *attempted*. Migration must obey §3.
**Acceptance.** Tests: a `False` return is counted as failed; `--retry-failed` targets only failures; support reply reports `email: False` on failure.
**Out of scope.** Changing the SMTP provider.

### F-04 · Audition deadline reminders — S/M, retention (solo-earnable trigger)
**Why.** `apps/auditions/models.py:109` and `:223` capture `deadline`; nothing reads it. Every current push trigger is social and dormant at this density; a deadline reminder is earned alone and lands exactly when the actor is about to tape.
**Requirements.** Scheduled job in `apps/growth/scheduler.py` under `_single_runner()` **with a `_LOCK_KEYS` entry**, hourly; push via the existing `send_notification` path with `data.type` routing to the audition; T-48h and T-24h, once each, idempotent (record what was sent); respect `audition_nudges_opt_out`; quiet hours 22:00–08:00 in the user's timezone if known, else LA; no email. Copy: specific ("*Callback for X is due tomorrow — tape tonight?*"), never "we miss you".
**Acceptance.** Recipient-query tests (the last nudge shipped with zero coverage and crashed on a FieldError — pin the query), idempotency test, opt-out test, lock-key test.
**Out of scope.** In-app calendar UI.

### F-03 · Self-Tapes library → Tape Review bridge (rank 9) — M, activation · **money path**
**Why.** Actors have tapes in the library (studio deliveries land there) with no way to review them in-app; the client-side path is dead because R2 `HEAD` returns 403.
**Requirements.** BE endpoint (e.g. `POST /v1/ai/jericho/review-recording/`) that takes a recording id the user owns, fetches the object **server-side**, and enters the **same charged pipeline** as `SelfTapeReviewView`: `_spend_token('self_tape_review')`, `Idempotency-Key` required, `first_review_eligible` honored, `review_gate` trim on the response, `SessionLog` written, `tape_review_complete` notification. FE: a "Get casting notes" door on each library item (`src/panels/Dashboard/SelfTapes/index.jsx`) → TapeReview in a mode that skips file pick. Ownership scoping on the recording lookup (IDOR is the house's most-repeated bug class).
**Acceptance.** Tests: ownership (another user's id → 404), idempotent replay doesn't double-charge, free-first-review grant applies exactly once, free user gets the trimmed shape.
**Constraint.** Branch only; Claude reviews line by line before this merges. List every place a token can be charged in your report.

### V-01 · Aurora Noir Ring 3 — desktop-class Tape Review report, DNA hexagon, Compare matrix — L, acquisition (share-shaped) + retention
**Why.** The desktop console exists (Rings 0–2) but the data screens inside it are still the mobile layouts. The spec is written and reviewed: FE `docs/web-platform-direction-aurora-noir-2026-07-28.md` §6 + "Ring 3" in the build plan, with file lists. The DNA hexagon is *the* screenshot-able identity artifact — built share-shaped it is an acquisition asset.
**Requirements.** Three sub-commits on one branch, each independently revertible: (a) Tape Review as a dated report page (entity header, evidence chips, two-pane reading view with pinned player + timestamped moments); (b) Performance DNA hexagon with numbers at vertices, overlay toggle (this tape / 30-day average / house-look ideal), table toggle; (c) Compare Takes as columns with sticky rubric rows, winner tint. **Desktop only** via `useIsMobile()`; native and mobile web render byte-identical to today. Hairlines, one accent per module, no glow on charts, reduced-motion respected. Free-tier trim applies unchanged — desktop must not reveal what the server didn't send.
**Acceptance.** Mobile snapshot/behavior unchanged (state exactly how you verified); each sub-commit builds green; no new dependency for charts (inline SVG).
**Out of scope.** Ring 4 (V-02), My Growth board.

### F-06 · Personal records server-side (rank 14 BE) — S/M, retention
**Why.** `src/utils/personalRecords.js` keeps bests in `localStorage` (`dst_personal_bests`) — lost on reinstall, wrong across devices, and it cannot include studio-delivered reviews.
**Requirements.** Per-user aggregate across `SessionLog`/`AnalysisJob` review results (overall + per-dimension bests, count, first/last); endpoint on the AI app, user-scoped; FE reads it and falls back to local only when offline; **locked (free) users see overall only** — never per-dimension bests, which would leak gated scores.
**Acceptance.** Tests: scoping, free-tier shape, aggregate correctness with a fixture of 3 reviews.

### F-05 · Two-question onboarding personalization — M, activation
**Why.** Brilliant-style: one or two answers that make the offer feel *for me* and give PostHog a segment. The 3-screen onboarding already collects interests/goals/level (now real BE fields).
**Requirements.** Exactly two questions, one screen, skippable: "What's on your plate?" (auditioning now / building my reel / between jobs) and "Taped before?" (yes / first time). Route **offer copy** (headline + body variants) and set PostHog person properties. Store on the user profile (reuse existing fields if they fit; if a migration is needed it obeys §3). No new screen *before* the offer — this replaces/merges into an existing step, it does not add one.
**Acceptance.** Funnel event names unchanged; test that each answer maps to a copy variant; onboarding total step count does not increase.

### V-02 · Aurora Noir Ring 4 — coherence sweep + the reveal ritual — M, visual
**Why.** `/settings` and `/notifications` still render the light MUI-era shell through `src/components/Shared/Layout` + `src/routes/sideMenuConfig.jsx` — the "trapdoor" out of the console. The reveal ritual (results as a 9:16 story card over the dimmed console) is the one motion moment that is also the share asset.
**Requirements.** Absorb the trapdoor routes into `DashboardLayout`'s console branch (desktop) and delete `sideMenuConfig.jsx` if nothing else reads it; `RecapStoryCard` per spec §6 (grade, one pull-quote note, take thumbnails, paged dots), reduced-motion fallback = static card; App.css border-style cleanup named in the ring plan.
**Acceptance.** No route regresses on mobile; desktop `/settings` renders inside the console; a test mounts `RecapStoryCard` with a review fixture.

### V-03 · Mobile polish pass — motion, safe areas, empty states — M, retention
**Why.** The app's craft floor is uneven: some screens have 320ms page-in and reduced-motion respect, some don't; fixed controls have sat under the home indicator before; several lists have blank or apologetic empty states.
**Requirements.** Audit first, then fix, in **one commit per screen**: (1) every fixed/bottom control has safe-area insets; (2) page transitions use the existing `aurora-page-in` and respect `prefers-reduced-motion`; (3) empty states for Self-Tapes, History, Auditions, Green Room — one honest sentence + one CTA that goes to the real next action, no invented counts, navigation stays visible; (4) `--type-*` tokens everywhere text is styled inline. Do **not** touch the tab bar, the swipe deck, or LiveSceneMode's control pairs (already fixed).
**Acceptance.** Report lists every change with a before/after description; every native-only claim is listed separately as *needs sim/device pass* — do not claim device-verified.

### E-02 · Signup double-count + attribution client IP — S, telemetry
**Why.** `user_signup` fires server-side and client-side (~19% overstatement). `apps/analytics/capi.py:57` derives the client IP from `X-Forwarded-For`; behind Railway the trusted header is `X-Real-IP` (see `helpers/throttling.py`), so Meta attribution gets the wrong IP.
**Requirements.** One canonical `user_signup` (server) with `$insert_id` dedup, client keeps a distinct client-only event if the FE needs it; `capi.py` prefers `X-Real-IP`, falls back to `REMOTE_ADDR`, never trusts XFF.
**Acceptance.** Tests on the IP helper; a note on how to verify dedup in PostHog.

### E-03 · `REVIEW_GATE_STRIP_SCORES` flip readiness — S, revenue · **prepare only**
**Why.** Per-dimension `scores` still ship to free users because older native clients derived the free gauge from them; the BE now always sends `headline_score`. The flag flips only when native adoption of the fallback is real.
**Requirements.** (1) Grep the FE for every ungated read of `raw.scores`/`scores` (start at `Jericho/index.jsx` `ReviewDetailSheet`) and fix any that would blank on a stripped payload; (2) write the exact PostHog query to read the share of iOS sessions on ≥1.0.25; (3) deliver a go/no-go with the flip command. **Do not flip.**

### E-04 · Postgres test path documented and green — S, build-right
**Why.** SQLite hides what Postgres catches; a migration chain was once unappliable from zero and the suite couldn't run on Postgres, and nobody noticed for weeks.
**Requirements.** A `make test-pg` (or documented one-liner) that runs the suite against local Postgres using the rig in §6; fix whatever is needed for it to pass **without** changing production behavior; document the recipe in the BE `README`/`docs`.
**Acceptance.** Suite green on both engines; the report states the counts.

---

## 6. Verification protocol (paste real output)

**BE**
```
cd ~/Downloads/Projects/DrSelfTape_BE
DEBUG=True SECRET_KEY=test-only-not-secret .venv/bin/python manage.py test <touched apps> -v 1
DEBUG=True SECRET_KEY=test-only-not-secret .venv/bin/python manage.py makemigrations --check --dry-run
```
Postgres rig (required when a migration is added): venv `/tmp/dstvenv`, DB `dst_fresh`:
```
DEBUG=True SECRET_KEY=test-only-not-secret DB_NAME=dst_fresh DB_USER=$(whoami) DB_PASSWORD="" DB_HOST=localhost DB_PORT=5432 \
  /tmp/dstvenv/bin/python manage.py test <apps>
```
(Not `DATABASE_URL` — that path forces SSL. `unset ASGI_WORKERS` or settings demands `REDIS_URL`.)

**FE**
```
cd ~/Downloads/Projects/DrSelfTape-development
npx eslint <changed files>
yarn build
```
Visual verification: if you can run `yarn dev` and drive a browser, do it and say what you looked at. If you cannot, say so — never describe a screen you did not see.

---

## 7. Report format — `~/Downloads/Projects/astra-reports/<ticket-id>.md`

```
# <ticket-id> — <one line>
Branch(es): <repo>:<branch> @ <sha>
## What changed
- file:line — what and why (one line each)
## How I verified
<exact commands + pasted output; test counts before/after>
## NOT verified
<every claim that needs a sim/device/browser pass or prod data, stated plainly>
## Decisions I made that you may disagree with
<each one, with the alternative I rejected and why>
## Risks / follow-ups
## Open questions
```
Honesty beats completeness. The last agent handoff was praised specifically for flagging its own unverified gaps instead of implying they passed.

---

## 8. Human-gated — for Joseph, not for you

- **Referral reward redesign** (credits-not-tokens, inviter rewarded on *activated* referral): needs a product decision on economics.
- **Weekly price points / store products**: App Store Connect has no `*_weekly` products; Joseph creates them, then the dormant weekly tier flips.
- **Email provider**: Gmail SMTP throttles real broadcasts; a proper ESP with DKIM on drselftape.app is a half-day once chosen.
- **Casting-director blind test** of note quality before scaling paid.
- **Sample review copy** (F-01) — Joseph approves the words an actor sees first.
- **Aurora Noir taste calls** are locked (full obsidian, Instrument Serif, zero 3D, one gold light source). Anything outside the spec is a question, not a decision.
