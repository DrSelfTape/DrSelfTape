# Banner improvements — September 17, 2026

Implemented locally and uploaded to App Store Connect on September 17, 2026. Not deployed to Railway or Vercel, and not submitted for App Review or published to the App Store.

iOS release candidate: version **1.0.28**, build **146**. Production bundle rebuilt with `VITE_API_URL=https://drselftape-api-production.up.railway.app/api`, Capacitor synced, signed archive and IPA export succeeded. No source maps are included in the native web assets. Archive: `/private/tmp/dst-146/App.xcarchive`; IPA: `/private/tmp/dst-146/export/App.ipa`.

Apple upload receipt: **UPLOAD SUCCEEDED with no errors**, September 17 at 14:55 PDT. Delivery UUID: `ce44fa14-7514-49bc-9e63-907dc6e6b92b`. Apple processing status is pending verification.

## Actor experience

- Update prompts require a valid installed native version. Unknown versions no longer default to an old release.
- Update actions recover after store navigation or failure; users can retry.
- “Remind me in 3 days” replaces indefinite dismissal for an individual release. A newer release is eligible immediately.
- Version checks refresh on foregrounding and every minute while visible.
- Update banners sit in the scrolling content below the header, rather than covering navigation.
- Announcements refresh when the account or completed-review state changes, on foregrounding, and every minute. Expired notices disappear while the app remains open.
- Dismissal is scoped to the account and announcement. Buttons have at least 44px targets, keyboard focus states, and larger type.

## Campaign controls

Backend migration: `notifications.0015_systemannouncement_audience_and_more`.

The Django admin now exposes announcements with audience, platform, priority, and start/end timestamps. Existing announcements retain audience/platform `all`; they are not automatically reclassified.

Supported audiences: `all`, `new_users` (account created within seven days), `returning_users` (older accounts), `needs_review`, `review_completed`, and `studio`. Review status uses the account's stored first-review completion flag. “Returning” describes account age, not a measured retention cohort.

Example command, after deploying the backend and applying its migration:

```sh
python manage.py set_announcement \
  --title "Your first review is free" \
  --body "Upload a take and get notes for your next audition." \
  --cta-label "Review my tape" --cta-url tape-review \
  --audience needs_review --platform all --priority 10 \
  --starts-at "2026-09-21T08:00:00-07:00" \
  --ends-at "2026-09-28T08:00:00-07:00" --keep-existing
```

Future campaigns leave current notices enabled. The highest-priority eligible campaign wins; ties prefer the newest. Expiry can reveal another still-enabled campaign. Immediate commands replace campaigns in the same audience/platform unless `--keep-existing` is supplied. Use admin to retire superseded offers. Dates require explicit timezones. Personalized responses are not cacheable; unauthenticated clients see only general announcements.

## Measurement

PostHog events: `announcement_banner_viewed`, `announcement_banner_clicked`, `announcement_banner_dismissed`, `announcement_banner_open_failed`, `announcement_banner_completed`; and `update_banner_viewed`, `update_banner_tapped`, `update_banner_dismissed`, `update_banner_open_failed`, `update_banner_completed`.

Views require viewport visibility. Review completion attribution applies only to a successful newly submitted review within 30 minutes of a review-banner tap, on the same account and browser session, and is consumed once. It does not count an old cached review as a conversion. Other destinations currently measure clicks, not business conversions. Update completion is observed when the app next reports the target version or newer after an update action; a store tap itself is not an update.

## Verification

VERIFY RESULTS
==============
Project: Vite/React + Django
Verification updated after repository lint cleanup.

✅ Frontend banner tests — 3 unit tests + 5 Chrome interaction tests
✅ Backend announcement tests — 6 tests
✅ Vite production build
✅ Focused ESLint — banner components/helpers and review integration
✅ Migration drift — no changes detected (local base database absent; test database migration exercised successfully)
✅ Django deployment checks — exit 0, with local development configuration warnings
✅ Repository-wide ESLint — zero errors, zero warnings after the build 147 cleanup. Generated native and Vercel build copies are excluded; application lint rules remain enabled. See [build 147 release notes](RELEASE-1.0.28-147.md) for the subsequent lifecycle fixes.
✅ Frontend regression suite — 217 passed, zero failed/cancelled/skipped. Command: `node --test --test-timeout=150000 --test-concurrency=1 --test-reporter=tap tests/*.test.mjs`. Browser harnesses now use the installed Chrome and `puppeteer-core`; onboarding includes deliberate slow-network scenarios.
✅ `git diff --check`

Status: local automated checks PASS. Physical-device checks remain separate from browser tests.

This JavaScript project has no TypeScript configuration or TypeScript compiler dependency; a separate `tsc` pass does not apply. Chrome tests mock native plugins; actual device testing of App Store handoff remains a release check.

## Release sequence

Deploy backend/migrate before publishing the frontend and distributing the updated native binary. Users must install the new native version to receive these client changes. No campaign content, notification blast, or production environment variable was changed by this implementation.
