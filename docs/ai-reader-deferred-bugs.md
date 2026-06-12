# AI reader — deferred bugs (need a device to fix safely)

**Update 2026-06-10:** 7 more fixed in TestFlight build 1.0.6 (71) — #1 (pause auto-advance), #6 (load-timeout leak), #8 (onpause stomp), #11 (speech stale-status), #14 (PDF size cap), #20 (stale dep), #21 (junk-report guard). **17 of 24 now fixed.** The 7 still open: #5, #7, #10, #17, #18, #19, #22 (the table below) — left for a focused pass because each needs an ~85-line re-indent, a cross-file dep restructure, a cascade rework, or touches billing across 5 endpoints.

From the 2026-06-09 overnight bug-hunt swarm (24 confirmed, all adversarially verified). 10 were fixed in the build on the sim; the 14 below were deferred — each is **real and verified**, but the fix risks an iOS regression I can't catch without a device, touches billing, or is low-impact. Fix these with a device + the AI scene partner / CD-Sim open. Full machine-readable detail (mechanism + verified refined_fix) is in the swarm output JSON.

| # | Severity | Fix-risk | Where | One-liner |
|---|----------|----------|-------|-----------|
| 1 | high | low* | `useScriptAudioPlayer.js:1257` pausePlayback + onpause | Pausing within 0.1s of a line's end lets the 100ms end-poll fire `handleAudioEnded` → spurious auto-advance while paused. *Fix in `onpause` (clear + null `checkInterval` so `onplay` re-arms) — touches iOS auto-advance (polling is the `onended` safety net), so verify auto-advance-after-pause on a device. |
| 5 | high | med | `ai/views.py:75,191,398,483,790` | Token is spent **before** the LLM call and never refunded when the call fails — users lose tokens on every AI error. Add a `refund_token` helper called in each except block, or spend-after-success. Touches billing → test. |
| 6 | med | low | `useScriptAudioPlayer.js:1089` waitForAudioLoad | 5s load timeout is never cleared — minor timer leak (already guarded by `resolved`, so no incorrect reject). Capture the id, `clearTimeout` in the 3 resolution callbacks + abort branch. |
| 7 | med | low | `useScriptAudioPlayer.js:1470` tone-change effect | Tone-change replay schedules an uncleared `setTimeout(playLine)` → rapid tone toggles stack overlapping `playLine` calls (double audio). Capture + clear the timeout in the effect cleanup. |
| 8 | med | med | `useScriptAudioPlayer.js:904` audio.onpause | `onpause` fires during `stopAllPlayback`'s pause loop + internal transitions, clearing highlight/state for an already-superseded element. Guard with the active-element check. |
| 10 | med | med | `useAiScenePartnerEffects.js:536` | Rehearsal-status polling interval is torn down + recreated on every render (poll may never fire). Stabilize deps / move to a ref. |
| 11 | med | med | `LiveSceneMode.jsx:539,548` | `SpeechRecognition` onend/onerror capture stale `status` → can drop or wrongly auto-restart listening. Use a ref for current status. |
| 14 | med | med | `CDSim/SidesUpload.jsx:282` | PDF read twice; the raw-stats pass has no size cap or timeout. Reuse the single parsed pass; cap + time-bound. |
| 17 | med | med | `ai/views.py:661` → `evolution.py:20` | Evolution pipeline runs a synchronous LLM call **inline** in the session-log POST (mitigated now by the 30s timeout from #4, but still blocks the response). Move to a background thread/task. |
| 18 | med | med | `evolution.py:169-253` | `evolve_actor_memory` writes ActorMemory/CoachingInsight/EvolutionMetric across many calls with **no transaction** — a mid-pipeline failure leaves a half-updated profile. Wrap in `transaction.atomic()`. |
| 19 | low | low | `useScriptAudioPlayer.js:1268` resumePlayback | Paused-resume ignores current `selectedAudioSpeed`/`selectedVolume`. Re-apply both before `play()`. |
| 20 | low | low | `useAiScenePartnerHandlers.js:378` confirmEndSession | `useCallback` omits `scriptAnalysis` from deps → stale `order_index` mapping. Add to deps (or use a ref). |
| 21 | low | med | `CDSim/index.jsx:259` | CD-Sim logs the session even when the coach call fell back / partially failed; a 'cancelled' run can double-log. Gate logging on a clean success. |
| 22 | low | low | `CDSim/index.jsx:87` AnalyzingPhase | Cascade timers desync from the real request — "GPT-4o is listening" completes visually while the request is still pending/errored. Drive the cascade off real request state. |

**Already fixed (for reference):** #2 TDZ resume crash, #3 Retry no-op, #4 LLM timeout, #9 TTS fallback watchdog, #12 voice mapping, #13 scene-gen timeout, #15/#16/#24 BE input validation, #23 Claude text extraction.
