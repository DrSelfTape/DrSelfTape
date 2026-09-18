# Dr Self Tape 1.0.28 (147)

September 17, 2026. Replaces build 146 as the warning-cleanup release candidate.

## Changes

- Resolved all 50 remaining ESLint warnings without disabling application rules: 42 hook dependency/lifecycle warnings and eight obsolete lint comments.
- Live-call initialization no longer restarts a pending media permission request when camera/mute state changes. The granted stream uses the latest settings; leaving before permission resolves stops the late stream.
- External listeners, one-shot timers, and teardown callbacks can read current values without restarting their subscriptions on every render.
- Media tiles recompute track visibility when stream versions change. Existing video nodes receive replacement streams without remounting their callback refs.
- Script playback picks up newly completed audio from Redux. Unmount cleanup retains access to audio created after mount and to the latest recorder, stream, and recording URLs.
- Scene playback callbacks include the current line, scroll, audio-priming, and native-listening controls. Dependent callbacks are declared in dependency order.
- Booking search cancels its actual pending timer on edits/unmount and preserves other URL filters. Booking labels resolve after auditions load without overwriting edited form fields.
- Stable derived arrays avoid unnecessary payment filtering/chat scrolling. Profile and audition requests have explicit dependencies; celebration timers do not restart when parent callbacks change.
- Browser suites use the declared `puppeteer-core` dependency and installed Chrome. Updated consent mocks support both historical baselines and the current helper module.

## Verification

- ESLint: zero errors, zero warnings.
- Production Vite build: passed with the production API address. Existing vendor chunk-size advisory remains; it is separate from the resolved ESLint warnings.
- New lifecycle browser regressions: four passed (latest callback teardown, permission-prompt state changes, leaving before permission resolves, and audio arriving from Redux).
- Onboarding browser suites: 33 passed, zero failed/cancelled/skipped.
- Full release suite: **217 passed, zero failed/cancelled/skipped**, with `node --test --test-timeout=150000 --test-concurrency=1 --test-reporter=tap tests/*.test.mjs`. `yarn test` now uses those concurrency/timeout settings.
- Updated local HTTP server teardown: the two affected onboarding suites passed all 22 cases again and exited cleanly in 4.2 seconds. No assertions were removed or weakened.
- iOS archive/export: passed. The exported IPA contains `com.drselftape.app`, version `1.0.28`, build `147`, the production API address, and no source maps. Native web assets match the Vite output byte-for-byte. IPA: `/private/tmp/dst-147/export/App.ipa`.
- Apple upload: **UPLOAD SUCCEEDED with no errors**, September 17, 2026 at 15:42 PDT. Delivery/build UUID: `2cfa0fdf-67e8-4f2d-939e-603723193eb1`.
- Apple processing: **VALID**; internal build state **IN_BETA_TESTING**. The existing **Dr. Self Tape Team** internal group has access to all builds, including 147. External state is `READY_FOR_BETA_SUBMISSION`; no external beta review/public App Store submission was made.
- TestFlight notes: English (`en-US`) notes saved from `TESTFLIGHT-147.txt` and read back to verify an exact match.

## Pre-ship review

**9.0/10 — GO for internal TestFlight testing**, not public release certification.

- Version: build 147 selected after confirming 146 is the latest uploaded build; the exported IPA's plist confirms 147.
- Artifact: production web build, native sync, signed archive, export, embedded-version/API checks, and asset hash comparison passed. No source maps are included.
- Test notes: build-specific recording, speech, call, booking-search, and banner checks saved to TestFlight and verified by reading them back.
- Browser verification: all 217 tests ran, including the four new lifecycle regressions and the 46 formerly skipped cases. Physical iOS microphone/speech/call checks remain outstanding.
- Telemetry: no new production logging, event sources, or changes to Sentry filtering.
- Compatibility: no new persisted-state shape, native plugin, or backend contract change in this warning cleanup. The earlier announcement migration is still a separate prerequisite for its new server controls.
- IAP/reviewer credentials: not applicable to this internal TestFlight upload; no purchase/auth changes in the warning cleanup and no App Review submission.

Ranked checks: (1) signed IPA version and embedded API verified; (2) current TestFlight notes saved and verified; (3) remaining on-device follow-up: test granting mic permission, changing camera/mute during join, scene playback/pause/resume/end, and a two-party call before public release.

The browser tests isolate network/native services. They do not establish flawless behavior on physical devices: microphone permissions, native speech recognition, background audio, real two-party calls, and App Store handoff still need device testing.

The announcement backend migration from the banner work remains a separate production deployment prerequisite. This release does not deploy Railway/Vercel or publish to the public App Store.
