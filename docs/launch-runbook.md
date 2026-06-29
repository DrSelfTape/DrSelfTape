# 1000-User Launch Runbook

_Compiled 2026-06-15 after the pre-1000 hardening + feature build. Everything
below is built & pushed; this is the sequence to actually turn it on. Nothing
here is "more building" — it's external setup, flag flips, and smoke-tests._

---

## 0. Deploy health (do first)
- [ ] Railway deploy GREEN — confirm migrations applied: `subscriptions 0006–0009`, `rehearsals 0003`, `ai 0006`.
- [ ] Vercel deploy GREEN.

## 1. Gate: Apple approves 1.0.7
The analyzer must be LIVE before monetization (it's the thing people pay for).
- [ ] 1.0.7 approved + live on the App Store.
- [ ] Cut a fresh TestFlight build after approval (flush any web-only Vercel changes — the iOS-catchup ritual).

## 2. External products (needed before Weekly + RevenueCat)
- [ ] Stripe: create 3 recurring **weekly** prices → paste IDs into `PRICE_IDS['basic'|'plus'|'premium']['weekly']` in `apps/subscriptions/utils.py`.
- [ ] App Store Connect: 3 weekly subscriptions.
- [ ] Google Play: 3 weekly subscriptions.
- [ ] RevenueCat: add the weekly products to the offering as `basic_weekly` / `plus_weekly` / `premium_weekly`.
- [ ] **Confirm `REVENUECAT_PRODUCT_MAP` keys EXACTLY match the RC dashboard product IDs** — fail-closed now rejects anything unmapped (no silent wrong-grant, but a mismatch = no grants).

## 3. Async analysis (removes the launch-day worker-saturation cliff)
- [ ] Schedule `python manage.py reap_stale_analysis_jobs` on Railway cron (~every 5 min).
- [ ] Smoke-test with `AI_ASYNC_ANALYSIS=true` on a build: Tape Review → returns fast → notes render after a few seconds; then a Compare Takes.
- [ ] Set `AI_ASYNC_ANALYSIS=true` in prod.

## 4. Monetization ON (the revenue flip)
- [ ] Run `python manage.py enable_token_limits` (sweeps existing alpha rows to metered; new signups already default metered).
- [ ] Set `AI_TOKEN_ENFORCEMENT=true` on Railway. (Existing ~130 users are grandfathered by the sweep; new signups are metered.)

## 5. Free-first-review onboarding (activation)
- [ ] Smoke-test with a **FRESH account** (the offer only shows on first onboarding): onboarding → "Your first Tape Review is free" → Try → upload → casting notes → "See plans" paywall → Membership.
- [ ] Set `VITE_FIRST_REVIEW_FLOW=true` + rebuild FE / cut a new TF build.

## 6. Weekly tier (after §2 products exist)
- [ ] Match the FE display prices to the real store prices (`Membership/index.jsx`: $4.99 / $6.99 / $9.99 are placeholders).
- [ ] Set `VITE_WEEKLY_ENABLED=true` + rebuild FE / new build.

## 7. Cleanup
- [ ] Delete the test account `tagteamproject@gmail.com` ("Mandy Mae") — in-app Delete Account, or:
      `railway ssh --service DrSelfTape-API "/opt/venv/bin/python manage.py shell -c \"from django.contrib.auth import get_user_model as G; G().objects.filter(email='tagteamproject@gmail.com').delete()\""`

## 8. Watch (first week — set decisions from real data)
- [ ] `usage_report` — token/AI usage; set the soft cap (`AI_SOFT_CAP_PER_DAY`, default 150) from real numbers (real usage maxed ~8/day pre-launch).
- [ ] PostHog Day-0 funnel: `first_review_offer_shown → started → completed → paywall_shown → paywall_tap`.
- [ ] Railway worker CPU/memory — if concurrent analyses pressure the box, that's the trigger for async **Phase 2** (Celery + worker service + R2, spec in `DrSelfTape_BE/docs/async-analysis-job-queue.md`).
- [ ] Sentry — new error paths: `token_check_failed` 503s, webhook `ignored: unmapped_product` / `sandbox`.

---

## Deliberately deferred (non-blocking — don't let these hold the launch)
- Async **Phase 2** (Celery + worker + R2) — only when volume justifies.
- Report-content existence-oracle, per-user list pagination, soft-cap insert race, Stripe charged-but-inactive reconciliation command — low severity.
- Wix RS256 webhook — intentionally dormant (Wix sends no webhooks; not a bug).

## Rollback levers (if something misbehaves after a flip)
- `AI_TOKEN_ENFORCEMENT=false` → everyone free again (kills any billing issue instantly).
- `AI_ASYNC_ANALYSIS=false` → back to synchronous analysis.
- `VITE_FIRST_REVIEW_FLOW` / `VITE_WEEKLY_ENABLED=false` + rebuild → hide the onboarding offer / weekly toggle.
- `AI_ADAPTIVE_THINKING=false` → kill adaptive thinking if cost/latency spikes.
