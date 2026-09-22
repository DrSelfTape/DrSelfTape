# Communications Center

Implementation and backend deployment: September 22, 2026. Backend commit `8b404e0` is live on Railway. Native version **1.0.28 (150)** is available to the internal TestFlight team and **WAITING_FOR_REVIEW** at Apple, replacing build 149. No production campaign was created or sent during this rollout. The hosted web frontend was not deployed in this release.

## Using it

Staff can open **Admin → Communications**, or the existing in-app Admin dashboard → **Open Communications Center**. The web route is `/admin/communications`.

1. Write the title, message, and optional action. Internal destinations include `tape-review`, `auditions`, `scenes`, `connect`, `home`, `profile`, `more`, and `live`. External destinations must use HTTPS.
2. Choose the audience and channels. Save a draft or preview unique account reach and channel exclusions. Previewing never sends.
3. Set a schedule and optional expiry. The date fields show the administrator's browser timezone and are stored in UTC.
4. Select **Schedule this campaign** or **Queue this campaign now** only after reviewing the audience. A signed preview expires after ten minutes; changes to the copy or eligible recipients require a fresh preview.
5. Monitor the campaign journal. Cancel remaining deliveries and remove the banner, or resume untouched email recipients after fixing a provider problem. Already accepted or in-flight messages cannot be recalled.

App users find **Notification preferences** inside the notification bell, on phone and desktop. Preferences cover news, offers, and practice tips. They can enable/disable campaign push and email and set timezone/quiet hours. Transactional booking, account, and actual audition-deadline notifications retain their existing settings.

## Delivery rules

- Every active eligible account can receive inbox messages, regardless of push registration or email preference. Older inbox messages remain accessible with **Load older messages**.
- Banner messages are persistent per-recipient records. Dismissal syncs across devices and reveals the next eligible notice. Existing legacy announcements also gain server-side dismissal and fallback. Higher-priority legacy notices can outrank campaigns.
- Promotional banners appear on calm browsing screens, not practice, recording, review, or meeting screens. Only one announcement is shown at a time.
- At most one outbound channel per account: iOS/Android push if eligible, otherwise email if explicitly permitted. VoIP tokens are never used for campaigns. Browser web-push is not included in this version.
- Email eligibility requires both the existing unsubscribe flag and a newly recorded explicit preference. The legacy default-true flag alone does not establish permission. Studio-provisioned accounts are selectable for inbox campaigns but do not automatically gain email permission.
- Outbound campaigns are capped at one per 24 hours and three per seven days. Existing practice-nudge records count conservatively toward those caps; nudge push also respects the new preference and quiet hours. This may suppress a campaign after an inbox-only nudge, favoring fewer interruptions.
- Quiet hours default to 8 p.m.–9 a.m., America/Los_Angeles. Equal start/end hours disable quiet hours. Queued outbound delivery waits; inbox/banner availability does not.
- Targeting uses organic signup, login, registered devices, and AI sessions. Historical `last_login` data alone is insufficient to establish activity. “Inactive” means no recorded activity in these sources; it does not mean no PostHog activity.
- Staff, inactive accounts, and recognized test-address patterns are excluded. Reach counts are accounts, not verified unique people. Exclusion reasons can overlap.
- iOS release campaigns are limited to accounts with an iOS token and wait for the target version or newer in Apple's public US listing. A TestFlight upload or an environment-variable change does not unlock delivery. This is not installed-version targeting.

## Reliability and reporting

The worker uses PostgreSQL advisory coordination and row locks. A unique `(campaign, user, channel)` ledger prevents duplicate inbox entries and duplicate claims. Preference and audience eligibility are checked again at dispatch. Drafts never enter the worker.

`queued` means not attempted. `sending` is a durable provider claim. `accepted` means available in the app or accepted by at least one native provider device/SMTP. It does **not** mean delivery to a person's screen. `unknown` means acceptance could not be established; it is never automatically retried. An interrupted claim becomes unknown after ten minutes. `suppressed` records withdrawal, expiry, cancellation, or cap exclusions.

Email uses the existing SMTP service, with at most 20 attempts per minute and a circuit breaker after an unconfirmed result. **Resume remaining email** restarts untouched rows only. This does not raise the provider's daily quota or solve sender reputation; SMTP acceptance, bounces, and inbox placement still need provider monitoring.

Opens/clicks/dismissals are idempotent authenticated receipts. Mark-all-read does not count as a human open. Email engagement is measured only on authenticated app arrivals for internal action links, not via tracking pixels; external email links have no click tracking. App-arrival tracking can be lost through a fresh login or an older client. Campaign IDs also accompany PostHog events.

Completed Tape Reviews are verified against a new, owned backend review session and attributed to the last tape-review campaign click within 30 minutes. Existing/recovered notes do not create new completions. Reports show distinct accounts; attribution is not proof that the campaign caused the review.

## Rollout

1. Deploy the backend first. Railway's existing start command runs migrations. Include the earlier undeployed announcement migration `0015` plus new `0016`–`0018`. No campaign is seeded by any migration.
2. Confirm `ENABLE_SCHEDULER=1` and the `process_communications` job runs every minute. The command `python manage.py process_communications` is the manual worker entry point; it can send already scheduled campaigns, so do not use it as a production smoke test with a nonempty queue.
3. Deploy the frontend with the existing production build environment, then package the next native build. Local `yarn build` alone is not a signed iOS release and should not overwrite the existing signed build's native assets.
4. Old apps still display legacy-compatible announcement text, but need the new binary for campaign inbox actions, channel preferences, and receipts. Keep campaigns as drafts until the intended audience has the required client.
5. The legacy HTTP `/notifications/broadcast/` sender now returns 410 to staff, directing them to preview/schedule. The older operator-only `broadcast_app_update` CLI remains available for compatibility; it is outside the new campaign workflow and should not be used for new campaigns.

The Apple lookup gate uses [Apple's documented ID lookup API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/LookupExamples.html). Lookup failures leave release campaigns queued.

## Verification

Final local results: **69 backend tests + 59 frontend tests passed**. ESLint passed, the production-configured Vite build passed, and `makemigrations --check --dry-run` reported no changes against the local test database. `node scripts/check-built-app.mjs` verified that the compiled app boots into its real sign-in form without JavaScript exceptions while intercepting all external requests. Public runtime configuration was preserved, Capacitor sync completed, and all 215 compiled web files matched the signed build 150 IPA. Code signature verification passed; no source maps were packaged.

The compiler still reports existing bundle-size and mixed static/dynamic-import warnings. There is no TypeScript configuration to check, and this backend has no configured pytest/ruff runner; its Django tests were used.

Backend coverage: audience eligibility, email permission, staff-only APIs, stale previews, duplicate scheduling/worker passes, receipt ownership, disclosure-safe 404s, quiet hours, contact caps, release gating, cancellation/expiry, email circuit-breaker resume, persistent banner dismissal, inbox pagination, and owned-session completion attribution.

Frontend coverage: explicit draft → preview → schedule, invalidating previews after edits, save-error recovery, preference persistence, safe CTA routing, cold-start account-scoped navigation, phone layout, and existing banner/push/recording-review regressions. Screenshots use sample data, never production customer records.

Production migrations `0015`–`0018` are applied. HTTPS health and reviewer login passed; authenticated preferences returned 200 and the actor account received 403 for staff campaigns. The scheduler is enabled and its communications job runs successfully. Production counts were zero campaigns and zero deliveries. Django's sole deployment warning was `security.W008`; Railway's edge was separately verified to redirect HTTP to HTTPS with 301. `LATEST_IOS_VERSION` remains `1.0.27` until the public release changes.

No direct APNs/FCM/SMTP campaign delivery or physical-device acceptance test was performed. TestFlight notes include foreground/background/cold-start navigation, preference persistence, banner dismissal, and purchase/microphone regression checks. See `RELEASE-1.0.28-150.md` for release identifiers and artifacts.
