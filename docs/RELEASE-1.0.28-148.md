# 1.0.28 (148): Studio design refresh

Approved luxury concept implemented for Scene Study, Tape Review, and mobile navigation. See MOBILE-DESIGN-REFRESH.md for scope and detailed verification. No backend deployment or public App Store submission is included.

Pre-archive review: 9.0/10 for internal TestFlight testing. Go.

- Version: both target configurations bumped from 147 to 148 after verifying 147 is Apple's latest build.
- Verification: all 220 tests passed, no skips; production build and lint passed. Browser screenshots inspected at phone sizes; rehearsal controls, review access gates, media failures and cleanup tested.
- Packaging: production API rebuild, Capacitor sync, signed archive, and IPA export passed. Exported IPA verified as `com.drselftape.app`, `1.0.28`, build `148`; embedded web assets match the production build byte-for-byte, contain the Studio changes and production API, and contain no source maps or localhost API address. Native status bar is LIGHT and content inset is never.
- Notes: fresh build-specific TestFlight notes in TESTFLIGHT-148.txt.
- Billing: no billing or subscription changes; existing review access-control tests pass.
- Telemetry: no new production console logging or changes to error filters.
- Compatibility: no persisted-state shape changes or backend migration required for the visual refresh.
- Documentation: approved reference, implementation scope, and device-check limitations recorded.

Ranked remaining checks:
1. On a physical iPhone, verify native listening/microphone permission, safe-area layout in both orientations, and video playback. This is the purpose of the internal TestFlight build; browser tests do not verify native behavior.
2. Inspect the More, notification, and profile controls on the smallest supported iPhone.

This grade authorizes an internal testing recommendation, not a claim that public-release device QA is complete. Upload authorized by the user.

The icon catalog used invalid universal assignments for individual icon sizes. Corrected iPhone/iPad/ios-marketing metadata without altering image artwork; all referenced images match slot dimensions. The exported IPA now declares the required icon files. Remaining non-blocking native warnings: unused legacy icon image, two existing Bluetooth option deprecations, and skipped App Intents extraction (no AppIntents dependency). Export completed despite an unrelated expired interactive Xcode account session; upload uses the existing App Store Connect API key.

IPA: `/private/tmp/dst-148/export/App.ipa`.

Upload accepted September 17, 2026 at 4:36 PM Pacific, with no upload errors. Delivery/build UUID: `0a1dbaf6-cf9e-48e9-b27d-9d3adf68b19e`. Apple processing is VALID and internal state is IN_BETA_TESTING. The Dr. Self Tape Team internal group has access to all builds. Fresh en-US TestFlight notes were saved and read back successfully. External state remains READY_FOR_BETA_SUBMISSION; no external beta review or public App Store release was submitted.
