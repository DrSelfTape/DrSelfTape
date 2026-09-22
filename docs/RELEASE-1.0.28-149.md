# Dr Self Tape 1.0.28 (149)

Built and submitted September 22, 2026. Apple accepted the upload at 10:24 AM Pacific with no errors; delivery/build UUID `d27761f9-450e-474f-ac7b-1ed2fc8a7614`. Processing is VALID; internal TestFlight state is IN_BETA_TESTING. iOS 1.0.28 and its submission are WAITING_FOR_REVIEW, with automatic release after approval. No web deployment was performed.

App Store version ID: `95f74a35-3c44-43a5-bfe8-794ecef2d82c`.
Review submission ID: `49eb9ee5-5655-40fa-a156-269e3d9357f2`.
Fresh en-US TestFlight notes saved and verified. The existing Dr. Self Tape Team internal group has access to all builds. External TestFlight beta review was not submitted; public App Store review was submitted as requested.

- IPA: `/Users/drselftape/Downloads/DrSelfTape-1.0.28-149/App.ipa` (41.9 MiB).
- Archive: `/private/tmp/dst-149/App.xcarchive`.
- SHA-256: `c4539592e8cec604beb320221356afe821021d23d8bf3e9a3e16dfbf790de6ee`.
- Bundle identifier: `com.drselftape.app`; marketing version `1.0.28`; build `149`.

Includes the review completion deduplication and corrected AI allowance wording described in [the investigation](health-posthog-2026-09-22.md), plus the existing source changes since build 148 (scene-finish action and tablet update banner). TestFlight notes are in `TESTFLIGHT-149.txt`.

## Verification

The production web bundle was rebuilt with the production Railway API. Public PostHog, RevenueCat iOS, and Sentry configuration was preserved from the preceding native bundle without printing keys. Capacitor sync, Release archive, export, and archive signature verification passed. The IPA version, API address, SDK configuration markers, and corrected analytics marker were checked. All 213 web files match the current Vite output byte-for-byte, excluding Finder `.DS_Store` metadata that Xcode does not package. No source maps are included.

The source change passed 53 targeted/regression tests and ESLint in the preceding verification. The production-configured Vite build passed again for this archive. No separate TypeScript project is configured. Real-device recording, purchases, and background recovery remain device acceptance checks.

## Build notices

- Vite retains its vendor chunk-size advisory.
- Xcode warns about an unassigned app-icon child and two existing deprecated `allowBluetooth` references.
- App Intents metadata extraction is skipped because the app has no AppIntents framework dependency.
- Export logged an expired Xcode account session, but manual distribution signing and local IPA export succeeded. This was not an Apple upload or upload-validation check.

Logs: `/private/tmp/dst-149-web-build.log`, `/private/tmp/dst-149-archive.log`, `/private/tmp/dst-149-export.log`.

## Pre-ship review

9.0/10 — GO for the authorized TestFlight upload and App Review submission after Apple processing completes.

- Version and artifact: actual IPA version, bundle ID, signature, configuration, source-map exclusion, and 213 matching assets verified.
- Metadata: new 1.0.28 version created; current What's New and reviewer notes saved and read back; 10 screenshot assets inherited across two device sets.
- Reviewer access: existing credentials successfully authenticated. Account state is inactive/no subscription, zero credits, AI consent not accepted; notes explicitly describe this and direct paid-feature testing through Apple sandbox purchases. No account privileges were changed.
- IAP metadata audit: passed for every SKU; no subscription product changes in this release.
- Tests: 53 regression tests including browser coverage passed; production build and lint passed. Previous build 148's broader visual checks are documented separately.
- Telemetry: completion receipts reduce repeated events and add a stable review identifier. No new console logging or altered Sentry filters.
- Compatibility: the new optional receipt field is in the non-persisted Jericho slice; no persisted-state or backend migration is required.
- Documentation: duplicate measurement cause and regression tests are recorded in the linked health investigation.

Remaining checks, ranked:
1. Physical-device acceptance of recording/microphone, purchases, and background recovery is not freshly verified on build 149. The user authorized TestFlight and Apple submission; passing browser tests is not claimed as device verification.
2. Compare version-2 analytics with backend records after users update; legacy events are not retroactively repaired.
