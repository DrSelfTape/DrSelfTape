# Approved Studio design

Design reference: `/Users/drselftape/Downloads/Dr-Self-Tape-Design-Concept.png`. The owner approved this concept and requested a luxury experience. Implementation follows its warm ivory, charcoal, restrained brass, serif typography, slim navigation, script-first rehearsal, and compact review summary. The generated reference contains sample footage and notes; the app uses the actor's actual data.

The September 17 TestFlight screenshots exposed an unlayered universal margin/padding reset in MobileApp. It overrode Tailwind v4 utilities, flattening card spacing and button padding throughout the mobile shell. The reset is removed; Tailwind preflight owns normalization.

Scene study now prioritizes the scrolling script, uses larger serif dialogue, a restrained current-line highlight, compact listening status, a next-line button, and a bottom pause/end toolbar. Repeated dialogue, microphone animation, and conversation history are hidden on phones because the script already supplies that context. Transcript, errors, timed-mode fallback, permission flow, and playback logic remain available. Mobile pause/resume uses the persistent controls; the existing desktop overlay remains. Landscape uses compact controls to keep the script usable.

Tape Review shows the actual submitted video when available, a compact score, a quick read, and a single focus for the next take. “Explore my notes” opens the full available notes in one tap. The summary receives the same entitlement-filtered data as the existing report. Missing scores are omitted, including null/empty/bool/out-of-range values; real zero scores remain. Missing or failed video keeps notes accessible without fabricated footage. Local video URLs are revoked on replacement/unmount.

The mobile shell now uses four bottom tabs matching the concept. More remains available through a labeled top-bar button; notifications and the profile control remain. The floating mascot is hidden on Tape Review so it cannot cover the report. Desktop report rendering remains separate.

Capacitor now uses LIGHT status-bar style (dark foreground on iOS) and contentInset never. The web layout already applies safe-area environment values; this avoids adding native automatic insets on top. These native changes require a rebuilt app and physical-device verification.

Verification includes production build and lint; compiled-CSS spacing checks with the actual mobile reset; mounted React review/rehearsal controls at 320×568, 393×852, and 844×390; review expansion, pause/resume, next-line, timed fallback, end, failed-video fallback, and local-media cleanup. Browser fixtures isolate services and exercise the actual presentation components; they do not verify native speech or physical iPhone safe areas. Verify microphone permission, listening, native video playback, portrait/landscape safe areas, and header/navigation on an iPhone before release.

Uploaded on request as 1.0.28 (148). Apple processing is VALID and the build is available for internal TestFlight testing. See RELEASE-1.0.28-148.md for packaging checks and remaining device QA.

Final validation: production build and ESLint passed; all 220 regression tests passed with no skips. Capacitor copy completed and the copied iOS configuration/style assets were verified. Browser previews with sample data are saved in Downloads as `Dr-Self-Tape-Rehearsal-Implemented.png` and `Dr-Self-Tape-Review-Implemented.png`.
