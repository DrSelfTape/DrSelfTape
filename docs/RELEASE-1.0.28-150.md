# Dr Self Tape 1.0.28 (150)

Released to internal TestFlight and submitted to App Review on September 22, 2026. Apple status: **WAITING_FOR_REVIEW**. Public App Store release still requires Apple's approval; release mode remains `AFTER_APPROVAL`.

## Release records

- App: `6770320460`, bundle `com.drselftape.app`.
- Build: `cc029e8d-071b-443d-ac30-b6dde5f0f98c`, processing `VALID`, internal state `IN_BETA_TESTING`.
- Internal group: Dr. Self Tape Team, automatic access to all builds.
- Version: `95f74a35-3c44-43a5-bfe8-794ecef2d82c`, iOS 1.0.28, linked to build 150.
- Review submission: `e6dde330-e50b-4c07-b9e0-2b5dd85c4e84`, `WAITING_FOR_REVIEW`.
- Superseded queued build 149 submission: `49eb9ee5-5655-40fa-a156-269e3d9357f2`.
- Railway backend commit: `8b404e0`, deployment `5b52be60-3639-42b2-bbcf-7c50cd7a49e6`, `SUCCESS`.
- IPA: `/Users/drselftape/Downloads/DrSelfTape-1.0.28-150/App.ipa`.
- IPA SHA-256: `8752ad553210bd6f74bcf584617f1f67e2296da7782102bdfebe253bd4417317`.
- Archive: `/private/tmp/dst-150/App.xcarchive`.

## Changes

Adds notification preferences and quiet hours, older inbox pagination, full campaign messages and safe navigation, persistent banner dismissal, and staff Communications Center with signed audience preview, scheduling, consent-aware delivery, and engagement receipts. Includes build 149's review-completion tracking corrections. See `COMMUNICATIONS-CENTER.md` for operational rules and limitations.

## Verification

69 Django notification tests and 59 browser/frontend tests passed. ESLint, production build, compiled-app startup smoke, migration drift check, and diff checks passed. Capacitor synced successfully; the signed IPA contains version 1.0.28/build 150 and all 215 compiled files match. Expected production API, analytics, RevenueCat, and Sentry configuration markers are present, with no source maps. macOS signature verification passed outside the sandbox. Archive, export, and Apple upload succeeded.

Production migration history includes notifications 0015–0018. HTTPS health returned 200, HTTP redirected to HTTPS with 301, reviewer login succeeded, preferences returned 200, and nonstaff campaign access returned 403. The minute scheduler runs successfully. Zero campaigns and zero deliveries existed after deployment. The public update environment remains 1.0.27. No customer campaign was created or sent.

IAP metadata audit passed every SKU. Fresh TestFlight notes, What's New, and build 150 reviewer notes were saved to Apple. Reviewer credentials were preserved; account had no active subscription, zero credits, no unlimited entitlement, and AI consent already accepted. Review submission and linked build were re-read and verified after submission.

## Remaining acceptance checks

Test on physical devices using `TESTFLIGHT-150.txt`, especially notification navigation while foregrounded, backgrounded, and closed; preferences; banner dismissal; purchase/restore; and microphone flows. Actual provider delivery was not exercised. Hosted web frontend was not deployed. Keep campaigns as drafts until the intended users have the required client. External TestFlight beta review was not submitted; internal team access is active.

Existing nonblocking Xcode icon/deprecation/AppIntents and Vite bundle/import warnings remain. Xcode account-session warning occurred during export; manual signing and export succeeded. Django security.W008 is mitigated by the verified edge HTTPS redirect.
