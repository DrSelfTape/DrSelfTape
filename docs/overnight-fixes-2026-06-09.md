# Overnight session — 2026-06-09 → 06-10

Worked the bug list + AI reader after Joseph went to bed. **Everything is built, compiles, and the final FE build is on the iPhone 17 sim.** BE is committed locally (`/tmp/dst_be`, commit `fa80cc1`) **but NOT pushed/deployed** — the auto-deploy guard correctly blocked an unattended production push. Push `origin/main` after a glance to deploy the BE half.

## Fixed (in the sim build)

### Structural bugs (the reported ones)
- **Scripts Practice/Coach "did nothing" on mobile** — root cause: the mobile shell navigates by `setTab`/`setCurrentPanel`, not URLs, so react-router `navigate()` no-ops there. `launchScript` now fires the `drst-navigate` event (Practice→`scenes` tab, Coach→`cd-sim` panel) like CraftJourney does. `Scripts/index.jsx`.
- **PDF upload → "1 line / 0 characters"** — `extractPdfText` collapsed each page to one line. Replaced with the proven sort-by-baseline extractor, now a **shared util** `utils/pdfText.js`, used by Scripts + **Auditions** (which had the identical bug at `Auditions/index.jsx:648`). `parseCharacterCount` now reads screenplay format (name on its own line).
- **Self-Tapes had no delete/rename** — NEW BE `SelfTapeDetailView` (`DELETE` removes the R2 object + frees the quota slot; `PATCH` renames) + `helpers.r2_storage.delete_from_r2`; FE card now has rename (inline) + delete (confirm), with the iOS tap belt. `growth/views.py`, `growth/urls.py`, `SelfTapes/index.jsx`.
- **Submissions ↔ Reports** — `ReportsView` now merges TapeSubmissions into totals/rates (it ignored all 97 logged submissions). `auditions/views.py`.
- **P2P session loop** — `StartRehearsalView` rejoins an existing fresh Daily room instead of minting a new one per tap; FE notification tap routes into the existing room. (Still needs a 2-device test.)
- Scripts delete-feedback toast + empty-content guard; CDSim slider pointer-capture (fork); search-bar aesthetic.

### AI reader — 10 of 24 swarm bugs fixed
- **#2 TDZ crash** killing partner-line resume (`useAiScenePartnerHandlers.js` — `line` used before declaration). High.
- **#3 CD-Sim Retry no-op** — added a `retryNonce` so Retry actually re-runs. High.
- **#4 LLM no timeout** — 30s + `max_retries=1` on both clients (`ai/llm.py`); a hung request was stranding the spinner + blocking the worker. High.
- **#23** defensive Claude text extraction (empty/non-text block no longer 500s).
- **#15/#16/#24** BE input validation (duration/rating, limit/months, previous_lines) — all could 500 on bad input.
- **#13** Scene Generator request timeout + inline error.
- **#12** CDReport voice mapping (every coach was defaulting to the wrong TTS voice).
- **#9** LiveSceneMode TTS fallback watchdog (could hang the scene forever).

## Deferred — verified real, but need a device to fix safely
See `docs/ai-reader-deferred-bugs.md` for the full list with file:line + fixes. Headlines:
- **#1 pause-near-end spurious auto-advance** (`useScriptAudioPlayer.js`) — high severity, but the fix touches iOS auto-advance (polling is the `onended` safety net on iOS); needs a device to confirm it doesn't regress.
- **#5 tokens spent before the LLM call, not refunded on failure** — real user/money impact; touches billing across 5 endpoints, wanted care + a test.
- #6/#7/#8/#10/#11/#14/#17/#18/#19/#20/#21/#22 — timer hygiene, stale closures, double-reads, transaction safety. Mostly medium-risk in the delicate audio engine the fork and I both avoided touching blind.

## Morning checklist
1. **Push BE** (`cd /tmp/dst_be && git push origin main`) — deploys Self-Tapes endpoint, AI hardening, Reports merge, P2P reuse. All additive/backward-compatible.
2. On the sim (after BE deploy): tap **Practice/Coach** on a script (should navigate now), **re-upload** the comedy PDF (should read ~50 lines / 2 chars), **rename + delete** a self-tape, walk **CD-Sim** (Retry works, correct coach voice).
3. Deploy the **FE** to Vercel once you're happy (it's only on the sim; web prod still on the prior build).
4. When you want the deferred AI bugs, point a device-session at `docs/ai-reader-deferred-bugs.md`.
