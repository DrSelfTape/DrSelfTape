# DST quality tools

Installed September 22, 2026: Maestro 2.10.0, Promptfoo 0.123.1, and axe-core 4.13.0. These checks are local development tools; they do not change the released app.

## Quick commands

Run from the frontend repository. Install root dependencies with `yarn install --frozen-lockfile` and the separate AI tooling with `yarn --cwd qa/ai install --frozen-lockfile`. Build the app with its normal development environment (`yarn build`) before browser or native QA; the fixtures use CSS from `dist/assets`.

| Command | Checks |
| --- | --- |
| `yarn test:a11y` | Five axe scans across onboarding, the sample review, and notification preferences on phone/desktop |
| `yarn test:ai` | Review contract unit tests, one offline Promptfoo replay, and an intentionally failing timestamp control |
| `yarn qa:ios` | Builds a separate unsigned simulator app named DST QA |
| `yarn test:maestro` | Onboarding sample navigation and notification preference persistence on an installed simulator app |

Reports are under `output/qa/` (ignored by Git). Maestro also saves screenshots and command traces under `~/.maestro/tests/`. The negative-control AI report deliberately contains a failure; its wrapper passes only when Promptfoo rejects that invalid review.

## iPhone simulator

After `yarn qa:ios`, boot an iPhone simulator and install the QA app:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl install booted /private/tmp/dst-qa-native/DerivedData/Build/Products/Debug-iphonesimulator/App.app
yarn test:maestro
```

If several simulators are running, use `DST_QA_DEVICE=<simulator-UDID> yarn test:maestro`.

The bundle identifier is `com.drselftape.qa`, separate from the shipping app. It renders real components using a fictional account and local preference storage. Its page policy blocks outbound service requests. It does not validate backend persistence, real sign-in, purchases, push delivery, microphone/camera behavior, or the complete shipping app.

The flows wait for the launch screen and animation to settle. QA entry taps also use Maestro's documented `retryTapIfNoChange` option after runs showed initial navigation taps had left the launch screen unchanged. Subsequent screen assertions remain mandatory. See [Maestro tap documentation](https://docs.maestro.dev/reference/commands-available/tapon).

Initial verification: both simulator flows passed together; eight browser regression tests passed, including five axe scans; 17 review-check unit tests and the Promptfoo replay/negative control passed. Lint and the configured production build passed. The build still reports a bundle-size advisory. Coverage remains limited to the journeys described here.

Maestro is installed at `~/.local/share/dst-tools/maestro-2.10.0/maestro`. Its official release archive SHA-256 was verified as `29b675e10cc12080e445e9bfb2e2b4e4dfb9c0f2e30d5884120d258b5e1cd991`. Java 21 and Xcode are available on this Mac. `scripts/maestro-local.sh` disables CLI analytics and selects Xcode. The global Codex MCP entry named `maestro` invokes this wrapper; a fresh Codex session may be needed to expose its tools.

## AI evaluation scope

Promptfoo is isolated in `qa/ai`, outside the app's runtime dependencies. Default runs replay the explicitly fictional editorial sample, without a model API or paid requests. They check structure, score ranges, timestamps, and selected unsupported claims. They do **not** establish acting-coach accuracy or model quality. See [AI evaluation guide](../qa/ai/README.md) for evaluating approved saved outputs and calibrating against human-reviewed tapes.

## Accessibility scope

The browser tests scan WCAG 2 A/AA and 2.1 A/AA rules supported by axe. They wait for finite UI transitions before measuring contrast. An initial scan found faint onboarding “Not now” text; its opacity override was removed. That source fix is local until a release is shipped.

Automated scans supplement manual VoiceOver, keyboard, Dynamic Type, and real-device review. Passing the covered screens is not a whole-app accessibility certification.

## Before a release

Run lint, the configured production build, browser regression tests, AI checks, and the simulator flows. Rebuild and reinstall DST QA whenever the tested components change. Extend the small initial suite as additional user journeys become stable; continue testing the actual release build separately.
