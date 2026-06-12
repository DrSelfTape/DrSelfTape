# AI Reader — "Listening" architecture (cue-aware scene partner)

*Research synthesis, 2026-06-10. Goal: replace the iOS fixed-timer ("pre-timed") reader with one that LISTENS and delivers its line on the actor's natural beat — tuned for longer dialogue and intentional dramatic pauses.*

## The core insight: endpoint on CONTENT, not silence

You know the actor's **exact line** from the script. So this isn't open-ended conversation AI — it's **endpointing against a known target**. The reader advances when the rolling transcript covers the **line's final tokens**, *not* when a silence timer fires.

Why this is the whole game for acting:
- A great performance is full of **intentional silences** — the loaded pause before a confession, the beat after a question, "...and then I just left." A fixed 1500ms timer (today's bug) steps on every one of them.
- A **mid-line dramatic pause carries no ending words**, so a content-matcher *holds* no matter how long the silence runs. Silence is only a debounce/anti-deadlock fallback — never the trigger.

## Recommended stack (native-first, $0 marginal)

| Layer | Choice |
|---|---|
| **Recognition (iOS)** | `@capgo/capacitor-speech-recognition` → native **SFSpeechRecognizer** (on-device). Works in WKWebView via the native bridge (the dead `webkitSpeechRecognition` is the whole reason for pre-timed today). `start({partialResults:true})` → subscribe to partials. |
| **Accuracy biasing** | Feed the expected line as `contextualStrings` to bias recognition toward the scripted words. (Keep the SFSpeechRecognizer path as primary — the iOS 26 SpeechAnalyzer path drops custom vocab.) |
| **Endpointing brain (JS)** | No fixed timer. Normalize each partial, fuzzy-match the **tail** of the rolling transcript against the **last 3–5 tokens** of the known line (Levenshtein ratio ~0.8). Fire on match **+ a 350–600ms silence-confirm debounce** (so trailing words aren't clipped). |
| **TTS pre-warm** | Generate the next reader line's TTS the moment the actor *starts* their line (you know it's coming) → playback is instant on match. This is where the "natural beat" latency actually lives. Reuse existing ElevenLabs/OpenAI TTS + Claude line-gen unchanged. |
| **Sessions** | One recognition session per cue (clean restart seams; sidesteps the ~60s SFSpeechRecognizer cap + auto-stop-on-silence). |
| **Escalation (only if needed)** | **Deepgram Flux** streaming over a Channels WebSocket (reuse the existing `ws_ticket` auth). `EndOfTurn` + `eot_timeout_ms` (≤10s) = a real "don't cut off the long speech" dial; `eager_eot` pre-warms TTS. Still gate final advance on the known-line match. **Premium-gated** (bills every rehearsal minute + needs network — bad in low-signal audition venues). |

## Phased build plan

- **Phase 0 — Spike the bridge (S).** Install the plugin, add `NSSpeechRecognitionUsageDescription` + `NSMicrophoneUsageDescription`, cap sync, cut a TestFlight build, confirm partial transcripts actually stream to JS in WKWebView **on a real device** against a hardcoded test line. *De-risks the one thing that could kill the approach.*
- **Phase 1 — Known-line endpointing engine (M).** The JS matcher (tail-token fuzzy match + 350–600ms confirm), `contextualStrings` biasing, wired to advance the reader behind a flag.
- **Phase 2 — Acting beat + TTS pre-warm (M).** Pre-generate next line's TTS at the actor's line start; per-scene "beat length" control; 2–3s silence **deadlock fallback** (so a mumbled final word never stalls the scene); handle the 60s restart seam.
- **Phase 3 — Robustness + Android parity (M).** Calibrate for whisper/loud rooms; mic-mute-on-background; verify Android partials via the same plugin (different native engine — verify, don't assume). Keep the matcher in the JS bundle so all platforms share one endpointing brain.
- **Phase 4 (conditional) — Streaming escalation (L).** Only if on-device accuracy on hard acting delivery is insufficient. Deepgram Flux, Premium tier.

## Decisions for Joseph
1. **Native-first vs cloud** — recommend native on-device (free, offline, no relay); cloud is the *conditional* escalation, not the start.
2. **Trigger model** — content-match (line tail) as the trigger; silence only as confirm + deadlock fallback. (Making silence the trigger is today's bug.)
3. **Fuzzy threshold aggressiveness** — the core tuning knob; per-scene adjustable. Too tight clips mumbled delivery; too loose advances early.
4. **One recognition session per cue** vs one per scene (cap/seam tradeoff).
5. **Cost ceiling** — target $0 marginal; if Flux is ever added, Premium-gate it.

## Risks
- **SFSpeechRecognizer accuracy on whispered/shouted/accented acting delivery** is materially lower than clean speech — the exact mode actors use. Mitigation: `contextualStrings` biasing + the silence deadlock fallback; this is also the trigger to escalate to Phase 4.
- **~60s session cap + auto-stop-on-silence** on the legacy path → long monologues need restart seams (per-cue restart, or iOS-26 path).
- **Plugin partial-results have had intermittent iOS bugs** — Phase 0 must prove streaming partials arrive on a real device before any further build.
- **New TestFlight build per change** (not a web push). Keep the matcher in JS so threshold tuning can ship via web where possible.
- **Android = different native engine** behind the same plugin — verify partials parity, don't assume.
- **TTS pre-warm raises ElevenLabs call volume** (discarded pre-warms on restart) — modest but real.

## The one-liner
**Native on-device speech (free, works in WKWebView) + match the actor's transcript against the *end of their known line* → the reader responds the instant they finish, and holds through every dramatic pause because a pause has no ending words.** That's the moat the actor-needs research called your #1 defensible differentiator — see [[actor-needs-research]].
