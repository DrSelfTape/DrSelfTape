# Find a Reader — Swipe Engagement Playbook

The swipe is the most habit-forming interaction pattern ever shipped to a phone — but the thing that makes it compelling isn't magic, it's a tight behavioral loop (trigger → action → variable reward → investment) that can be rebuilt around *craft* instead of validation. This playbook translates the dating-app engagement engine (Tinder/Hinge) into a motivating, craft-focused swipe loop for actors, where the dopamine attaches to **finding a great scene partner** and **getting into the room together** — never to being wanted, ranked, or rated. The north star is stolen and inverted from Hinge's "Designed to be Deleted": **Designed to get you in the room, together.** Success = a completed read, then the *next* one. Every mechanic below is anchored to the actor's real goal (a rehearsed scene, a kept-warm craft, a trusted bench of collaborators) and built on the Self-Determination Theory triad — **autonomy** (filter your own deck), **competence** (a growing reader bench + reps logged), and **relatedness** (real collaborators) — so no single match-drought can flatten motivation.

---

## The Headline Moves

- **Put the payoff in the gesture, not the match.** Matches are rare; actors perform hundreds of swipes between them. Engineer a small, honest, complete reward into *both* directions of *every* swipe — RIGHT feels like *casting* a partner, LEFT feels like *curating* your bench. Neither feels like rejection.
- **Asymmetric haptics on threshold-cross, not release.** RIGHT ("READ WITH") = `.medium` impact at the moment the stamp first appears, so the body learns where "commit" lives and that *seeking a partner* is the rewarded act. LEFT ("pass") = `.light` tick or nothing. Reserve `.success` exclusively for a mutual match.
- **Re-skin the stamps for craft, kill the red X.** Warm-gold **"READ WITH" / "RUN LINES"** on the right; neutral-slate **"NOT NOW" / "PASS"** on the left. Never a red rejection X, never a heart, never rejection language.
- **Reserve the cinematic celebration for the mutual match only.** Tier the payoffs: any swipe = micro (haptic + glyph), deck milestone = small chip, mutual match = the full-screen "Scene Partners!" moment. Over-confetti-ing every swipe destroys the novelty that makes the real win land.
- **Convert the match spike into a booked read immediately.** The match screen offers one frictionless CTA — "Schedule a read" / "Send a scene" / "Start a read now" (CallKit) — with a pre-filled, craft-specific opener so there's no blank-page "now what do I say."
- **Add a third button and a free, generous Rewind.** "Bookmark / Maybe" — choosing a long-term collaborator is higher-stakes than a date, so don't force binary yes/no. Free Rewind because a mis-flick past a great partner is a real loss to a working actor.
- **End the deck; don't doom-feed it.** Cap the session ("12 fresh readers today"), end on a craft-accomplishment summary, and route the CTA *out* of the app into the actual rehearsal product. The ethical inversion of the doom-scroll: the app celebrates by sending you off to *do the craft*.
- **Honesty is the engine, not a constraint.** Never fabricate "someone likes you," never show who passed, never gate basic connection behind a paywall. For a rejection-saturated professional audience, trust *is* the retention engine — one fake-urgency push and serious actors tune out permanently.

---

## 1. The Core Swipe Loop & Dopamine Design

The swipe is the single most habit-forming interaction pattern ever shipped to a phone. But what makes it compelling isn't magic — it's a tight behavioral loop that can be rebuilt around *craft* instead of validation. Below is exactly what fires in the brain, why, and how we recreate it in Find-a-Reader so the dopamine attaches to **finding a great scene partner**, not to being wanted.

### The loop, in one diagram

```
TRIGGER ──▶ ACTION ──▶ VARIABLE REWARD ──▶ INVESTMENT ──┐
   ▲         (swipe)     (match? fit?)      (tag/save)   │
   └──────────────────────────────────────────────────────┘
        each investment sharpens tomorrow's deck
```

This is Nir Eyal's Hook loop, and it's the spine of every mechanic that follows. The step competitors win on is **Investment** — the small thing the user gives back each session (a saved partner, a genre tag, an uploaded scene) that makes the *next* loop better. That compounding asset (a tuned roster of trusted readers + rehearsal history) is our real moat and the honest reason to stay.

---

### 1. Trigger — point the cue at a real craft opportunity

Conditioned cues fire anticipatory dopamine *before* the app even opens. Dating apps exploit this with fake-urgency spam; we earn it by only firing on genuine value.

- **External triggers (push), on honest variable timing:** "A reader who does Chekhov just joined near you," "Your matched partner is free to rehearse tonight," "Pilot season — find a reader for your audition." Variable timing beats a fixed schedule (users acclimate to fixed), but every cue must point to a real action.
- **The non-negotiable rule:** never dilute push with growth spam. Reserve it for *match*, *confirmed read time*, *"your partner sent the scene."* If the tease says someone picked you, the open **must** show that person. Trust is the substrate of long-term engagement — manipulative loops win the session and lose the user.
- **Internal trigger (the durable one):** the feeling "I have a self-tape due and no one to read with." That's the itch we want the app to own.

**Buildable:** a Capacitor push integration (`@capacitor/push-notifications`) with user-controllable frequency, fired server-side off real events (new local reader, partner availability, match). No fabricated "someone liked you" bait.

---

### 2. Action — keep it a frictionless, kinesthetic toy

The swipe works because it's a single binary micro-decision with instant feedback, and because the *gesture itself* is pleasurable independent of outcome. Lower the activation energy and users make far more reps — which gives variable rewards more chances to fire.

**The card mechanics (these are craft-neutral and worth getting exactly right):**

- **Drag-coupled tilt** — rotation proportional to horizontal drag, clamped ~±15°, pivoting near the bottom edge so it flicks like a real card off a table. `rotate = clamp(deltaX * 0.03 * (deltaY/80), -15, 15)`.
- **Progressive overlay** — a stamp fades in with opacity mapped to drag distance, full at the commit threshold. Replace LIKE/NOPE with **"READ WITH"** (warm gold) and **"NOT NOW"** (neutral slate). **Never a red rejection X.**
- **Spring snap-back** below threshold — a damped overshoot whose bounce scales with how far they got. This doubles as "undo by hesitation": unsure half-swipes invite a more deliberate choice instead of punishing.
- **Velocity-aware fly-off** — the card inherits release velocity (fast flick = fast exit + more spin). This is the single most *satisfying* beat and is fully craft-neutral. Give the right-swipe a touch more energy / a brief gold trail; let the pass glide off quietly.
- **Next-card peek** — card #2 sits scaled-down and offset, promoting to full size with a small spring as #1 leaves. The visible-but-incomplete next card is the curiosity engine that makes the deck feel alive.

**Haptics & sound (asymmetric on purpose):**

- Right ("READ WITH") = `.medium` impact, fired **at threshold-cross, not release**, so the body learns exactly where "commit" is and learns that *seeking a partner* is the rewarded act.
- Left ("pass") = a `.light` tick or nothing — frictionless, emotionally weightless.
- Sound **default OFF** (actors swipe on set / in public) with an optional tasteful pack: a warm theatrical "cue" tone on the affirmative, near-silence on the pass. Never a casino "cha-ching."

**React/Capacitor stack:** a gesture lib (`@use-gesture/react` + `react-spring` or Framer Motion) for the physics; `@capacitor/haptics` for `impact`/`notification` feedback; the swipe and the explicit Pass / Read-With buttons should route through the **identical** tilt→stamp→fly-off→haptic sequence so tapping is never a degraded path.

**One thing the dating apps don't have — a third button:** a **"Bookmark / Maybe"** (save for later). Choosing a long-term collaborator is higher-stakes than a date; don't force binary yes/no. Route it through the same animation.

---

### 3. Variable Reward — the engine, re-pointed at fit

This is the heart of it. Rewards on a **variable-ratio schedule** (unpredictable *which* action pays off) produce the highest, most persistent response rate of any schedule and are the most resistant to extinction — Skinner's pigeons pecked fastest here. Crucially, **dopamine fires in anticipation, not at receipt** (Berridge's "wanting" ≫ "liking"; reward-prediction-error spikes on *surprise*). The not-knowing is the hook.

Three things we do differently from a hot-or-not slot machine:

**a) Make the variability reward CRAFT FIT, not desirability.** You never know if the next card is a reader with your exact accent, your sides' genre, or who's online right now. Don't batch-reveal matches — let mutual right-swipes surface mid-deck on an unpredictable cadence so every card carries genuine "could this be a scene partner for *my* sides?" tension. Eyal's three reward types, re-aimed:

- **Hunt** → every card is a real resource: scene specialties (Shakespeare, Mamet, comedic), availability tonight, accent range, a reading clip.
- **Tribe** → professional belonging, *not* attractiveness. "A fellow working actor wants to build a scene with you." Keep validation **private and craft-oriented** — no public popularity leaderboards (that breeds the self-esteem harm dating apps cause).
- **Self** → the ethical anchor: tie the loop to the actor's own mastery — "scenes rehearsed," "new genres practiced," "reps this month." **Lead with Self over Tribe.** The deeper reward of swiping is building a body of rehearsal work, not collecting matches.

**b) Reserve the big celebration for the real achievement.** Tier the payoffs so the cinematic moment never goes stale (over-confetti-ing kills the novelty):

| Event | Reward tier |
|---|---|
| Any swipe | Micro — haptic + stamp glyph |
| Deck milestone | Small — a chip / "deck refined" tick |
| **Mutual match** | **Big — full-screen, animated, sound** |

The match moment: animate **both headshots sliding toward center**, a ~0.5s hold + rising tone (anticipation amplifies the dopamine), then resolve to **"Scene partners! — You both want to read."** `UINotificationFeedbackGenerator.success` + `canvas-confetti`, themed around theater (clapperboard snap / spotlight sweep), **never hearts.** Keep it under ~1.2s so it never blocks a working actor mid-session. The copy is explicitly *mutual and craft-framed* ("You're both prepping self-tapes this week") — the oxytocin/trust beat is earned by emphasizing they were chosen as a *collaborator*.

**c) Convert the spike into action immediately.** The 24h after a match is peak motivation. The celebration's single CTA is a concrete next step — **"Propose a scene," "Pick a time," "Send your sides,"** ideally with a pre-filled opener ("Want to run my 1.5-page drama scene tonight?"). A gentle 48–72h nudge if nothing's booked ("Your scene partner is waiting"). The goal is a queued *rehearsal*, not a vanity match count — this is what keeps "wanting" and "liking" coupled instead of devolving into empty swiping.

**The honest version of "near-miss":** only ever surface **true** proximity signals — "Maya viewed your profile and is deciding," "You're 1 mutual swipe from a full scene group." Never fabricated ones.

---

### 4. Investment — the step that makes tomorrow's deck better

After the reward, ask for one tiny thing that compounds: tag a genre you want to rehearse, save a partner to your bench, rate a read, upload a scene. Then **show the payoff explicitly**: *"Because you've rehearsed comedy 5×, your deck now leads with comedic readers."* Disclosure-style reciprocity also lives here — requiring a right-swipe to attach intent ("I'd love to run that Mamet two-hander") raises match quality *and* hands the match a built-in opener, killing the cold "hey."

Surface the **left-swipe as visible taste-tuning** too: occasionally confirm "Got it — fewer comedic readers, more dramatic," with a lightweight preferences panel that visibly updates. The pass becomes *authorship over your own feed* (autonomy + competence, per SDT), never a verdict on the other actor's worth.

---

### Healthy scarcity & the daily return — without the shakedown

Scarcity raises the perceived value of each pick and forces selectivity, which **protects match quality** (the whole network works better when requests are intentional). But for a craft tool the line is bright:

- **Soft daily cap** on right-swipes ("10 thoughtful read requests a day — choose partners you'd actually rehearse with"), shown with an **honest count and reset time**. Frame the reset as a ritual, not a punishment.
- **One curated "Top Scene Partner Today"** — matched on complementary role types, overlapping availability, timezone for live reads, training level. The daily refresh is the retention heartbeat.
- **Scarce "Priority Read" token** (1/day or 1/week, non-rolling, **note required**) — "this actor specifically wants to rehearse with YOU." Scarcity here signals genuine intent, not purchase pressure.
- **"Wants to Read With You" inbox** — show the count + *what they reacted to* ("interested in your Pinter sides"). Use curiosity to **reconnect actors, not to extract a fee** for basic function. Reveal by swiping your own deck; reserve instant-reveal as a time-saver perk, never a gate on connection.
- **Never gate the core "find a human to rehearse with"** behind a paywall, and **never show who passed on you.** Actors are a rejection-saturated population; shielding them from one more visible "no" is both kinder and stickier. Premium = power features (advanced filters, generous Rewind, unlimited Spotlights) — not basic connection.

---

### Craft streaks, not login streaks

Loss aversion makes a streak the thing you protect — but anchor it to the **real-world habit** (rehearsal), framed by **identity**, not grind:

- Streak = days you "kept your craft warm" (ran lines, did a read, accepted a request). **"Working actors stay match-fit."**
- **One-rep threshold** — a single line into the AI reader keeps it alive on busy days.
- **"Rest Day / On Set" freeze** — "Booked a job? Bank a rest day, your streak's safe." This turns a retention lever into brand goodwill by respecting the working-actor reality.
- **Rehearsal-partner streaks** (Snapchat-style, shared) — "You and Maya have rehearsed 4 weeks running." This protects the *relationship*, which is exactly the pro outcome we want.

---

### The ethical north star — *Designed to get you in the room, together*

The same dopamine loop, every reward re-pointed at the actor's real goal. Two design moves keep it motivating rather than manipulative:

1. **Re-point the variable-ratio jackpot.** Don't make the *match* the slot-machine you chase. Make matches feel **earned by good-fit curation** (predictable cause-and-effect: better filters → better matches) and reserve gentle *surprise* for low-stakes competence nudges ("A reader you passed on came back — want another look?"). Predictability where it matters, pleasant surprise where it's safe.

2. **Re-introduce stopping cues.** Infinite swipe deliberately removes the completion signal. We add one: cap the deck ("12 new readers today"), end on a **craft-accomplishment summary** — *"2 new matches, 4 on your bench. Want to schedule a read?"* — with a CTA **into the actual rehearsal/CallKit feature, not "keep swiping."** The ethical inversion of the doom-scroll: the app celebrates by sending you off to *do the craft*.

The recurring loop is our retention gift that dating apps don't have: a great scene partner isn't deleted after one success — you book the *next* read. Success = a completed rehearsal, then a regular collaborator. Build the loop on the SDT triad — **autonomy** (filter your own deck), **competence** (a growing reader bench + reps logged), **relatedness** (a real collaborator) — and no single match-drought can kill motivation, because three independent payoff channels are always running.

---

## 2. Per-Swipe Payoffs (the dopamine boost on LEFT and RIGHT)

The single most important design rule for this deck: **the payoff lives in the gesture, not in the match.** A match is rare and mutual — you can't control when it fires. But every actor performs hundreds of swipes between matches, and if those swipes feel dead, the loop dies long before a match ever lands. So we engineer a small, honest, complete reward into *both* directions of every single swipe. Right feels like *casting* a partner. Left feels like *curating* your bench. Neither feels like rating a body, and neither feels like rejection.

The governing asymmetry (from Hinge/Tinder research): **all the dopamine goes on the deliberate RIGHT; all the friction-removal goes on the dismissive LEFT.** Right is rich, weighty, and slightly celebratory. Left is instant, dignified, weightless, and silent to the other actor. Both must close their loop — the brain needs a completion cue on *every* action, or left-swipes feel like dead ends.

Below is the buildable spec for one swipe, frame by frame, in both directions.

---

### The card at rest (the thing you're manipulating)

One card, one decision — never a grid. The card carries a **professional**, not a face-to-rate:

- Headshot (top 60%)
- One craft tag line: `Meisner · Drama · NYC · Free tonight`
- A specific likeable element you can swipe *on* (Hinge "specific like"): a tapped self-tape clip, a listed skill (`Stage combat`), or a craft prompt (`A role I'd kill to rehearse: Stanley`)
- Behind it, a real peek of card #2 — next headshot + tag, scaled to `0.94`, offset down `12px`. The "who could I work with next" curiosity gap is always visible.

---

### During the drag (continuous, reversible preview — anticipation builds before commit)

Identical physics both directions; only the *color and copy* diverge. The dopamine is in the build-up, so we make the consequence visible *before* you commit.

**Card physics (both directions, React/Capacitor):**
- **Drag-coupled rotation:** `rotation = (deltaX * 0.03) * clamp(deltaY/80, 0, 1)`, clamped to **±15°**, pivoting near the bottom edge so the top swings like a card flicked off a table. Use `react-spring`/`@use-gesture` or Framer Motion `motion.div` with a `transform` driven by drag delta.
- **Progressive stamp fade:** overlay opacity = `clamp(abs(deltaX) / threshold, 0, 1)`. Invisible at rest, full opacity exactly at the commit threshold, with a small `scale: 1 → 1.08` pop in the last 10%.
- **Ambient tint bleed:** the card border/glow and the background behind the deck shift hue proportional to drag — pre-attentive color tells the body the direction before the eyes read the word.

**RIGHT drag — "the deliberate yes":**
- Stamp: **`READ WITH`** (or `RUN LINES`), warm **gold** `#E8B04B`, rotated ~12° like an ink stamp.
- Tint: brand warm gold glow blooming from the right edge.
- Haptic: **one `selection` tick** (`UISelectionFeedbackGenerator` / Capacitor Haptics `ImpactStyle.Light`) the *instant the stamp first appears* — "I see what I'm about to do." This is the anticipation beat.

**LEFT drag — "the dignified pass":**
- Stamp: **`NOT THIS ONE`** or **`PASS`** in calm neutral **slate** `#8A93A0`. **Never a red X. Never a rejection symbol.**
- Tint: cool, quiet slate — reads as "not this scene partner right now," not "rejected a human."
- Haptic: **none during drag.** Passing must feel weightless.

---

### Spring snap-back (the hesitation safety valve)

Release before threshold → the card springs back to center with a damped spring (`stiffness: 300, damping: 22`, slight overshoot + settle). Bounce magnitude scales with how far you got, so a near-miss bounces differently than a tiny nudge — honest feedback that teaches the gesture without instructions. Frame this as *"undo by hesitation"*: a half-swipe on a partner you're unsure about gently invites a more deliberate choice rather than punishing you.

---

### Commit + fly-off (the satisfying dismissal — the payoff beat)

Cross the threshold and the card **inherits your release velocity** — a fast flick launches harder with more spin; a slow drag-past-threshold glides off. Natural ease-out / inertial decay on exit (`exit velocity = release velocity`, decelerating). This "obeying physics I authored" is the single most satisfying, craft-neutral beat in the whole flow.

**RIGHT commit — energetic, affirming, *slightly* celebratory (but NOT a match):**
| Channel | Spec |
|---|---|
| Haptic | **`ImpactStyle.Medium`** (`UIImpactFeedbackGenerator(.medium)`) at threshold-cross — "snapped into place." Heavier than left so the *body learns the affirmative action is the rewarded one.* |
| Animation | Card flies right with a touch more spin (`+8°` extra rotation) and a brief **gold trail/sparkle** along its exit path (V1Sparkles or a 4–6 particle burst, decaying). |
| Sound | **Default OFF** (actors swipe on set / in public). Optional sound pack: a warm, theatrical **"cue" tone** — ascending, like a stage cue light. **Never a "cha-ching."** |
| Micro-copy | A 1.2s status chip slides up from the bottom: **`You're on Maya's list to read`** — confirming your intent *traveled* and is now pending. Honest about what just happened: you entered their queue. |

**LEFT commit — instant, quiet, guilt-free, invisible to them:**
| Channel | Spec |
|---|---|
| Haptic | A single very soft **`ImpactStyle.Light`** tick, or none. |
| Animation | Card glides off left calmly — *less* spin than right, no trail, no flourish. |
| Sound | Near-silent (a soft paper-slide at most). |
| Micro-copy | No traveling notification — **the left-swipe is silent and invisible to the actor passed over.** The only social signal that ever travels is a right-swipe. (Actors are a rejection-saturated population; shielding them from one more visible "no" is both kinder and stickier.) |
| The hidden payoff | Occasionally (not every pass — that becomes noise) surface a tiny self-directed confirmation: **`Got it — fewer comedic readers, more drama`**, and tick a lightweight **"Your reader preferences"** meter. The pass *teaches the deck*, and you *see it learn*. The reward on a pass is authorship over your own feed — "I just sharpened the kind of partner I'll be shown" — not a verdict on the other actor's worth. |

---

### Next-card reveal (the anticipation engine that makes the loop feel alive)

The instant the top card leaves, card #2 **promotes** into place with a small spring: `scale 0.94 → 1.0`, `offsetY 12 → 0`, `stiffness: 260, damping: 24` (~250ms). A hint of card #3 becomes visible behind it. The pre-loaded next prompt (Fogg) means the next decision is already staged — *the act of completing one swipe immediately presents the next "who could this be?"* This is the momentum mechanic that makes the deck feel responsive and bottomless **without** being a doom-feed.

---

### Buttons mirror the gesture (same payoff, no degraded path)

Below the deck: **Pass** (slate) · **Bookmark / Maybe** · **Read With** (gold). Tapping any button triggers the *identical* tilt → stamp → fly-off → haptic → next-card sequence as a manual swipe, including the medium-impact haptic on Read With. The **Bookmark / Maybe** is the third option dating apps lack — choosing a long-term *collaborator* is higher-stakes than a date, so we don't force a binary. It routes through the same satisfying animation and saves the card to a shortlist.

---

### Free, generous rewind (the loss-aversion safety valve)

A dedicated rewind control animates the just-dismissed card flying *back* onto the top of the stack (the fly-off in reverse — itself a novel, satisfying motion). **Keep it free and generous — never a paywalled upsell.** Missing a great scene partner to a mis-flick is a real loss to a working actor; making rewind free signals the app is on the actor's side. On restore, briefly highlight the craft tag that might have made them reconsider (`Free tonight · does your audition's genre`).

---

### What we deliberately do NOT do on a swipe

To keep the *match* celebration meaningful (and avoid haptic/animation fatigue), the single swipe stays restrained:
- **No confetti on a right-swipe.** Confetti is reserved exclusively for the rare **mutual match** ("Scene partners!" — full-screen, `UINotificationFeedbackGenerator.success`, clapperboard snap). Over-confetti-ing every swipe destroys the novelty that makes the real win land.
- **No "cha-ching" / casino sounds** anywhere. The audio language is *stage and booth*, not slot machine.
- **No red, no X, no rejection language** on the pass — ever.
- **No fabricated "almost!" teases** on a swipe. Any near-miss signal must be true.

---

### Why this stays motivating, not manipulative

Every per-swipe payoff is anchored to one of the three healthy reward channels (SDT), never to raw validation:

- **RIGHT** rewards **autonomy + relatedness** — *you* are casting a real craft collaborator; the chip confirms genuine intent traveled.
- **LEFT** rewards **autonomy + competence** — *you* are curating your own bench and visibly tuning the deck; passing is authorship, not rejection.
- **The gesture itself** is intrinsically pleasurable (kinesthetic reward), so browsing for a scene partner is pleasant downtime even between matches — which is *most* swipes.

Both directions close their loop. Both feel good. And neither pretends to be the jackpot — that's saved for the one event that actually advances the actor's real goal: a confirmed partner to go run a scene with.

---

## 3. The Match & Like Celebrations

These are the payoff moments of the reader-matching loop. Their job is to convert a swipe into an actual rehearsal — and to do it in a way that feels like *casting interest from a fellow working actor*, not validation from a slot machine. Three distinct moments, three distinct intensities. We deliberately tier them (per the "over-confetti-ing" research): only the rarest, most goal-advancing event — the mutual match — earns the full cinematic treatment. Everything else stays restrained so the big moment keeps its signal.

**Tier overview**

| Moment | Trigger | Intensity | Haptic | Sound (default OFF) |
|---|---|---|---|---|
| Like confirmation | You right-swipe someone | Micro | `.medium` impact | warm single "cue" tone |
| "Someone wants to read with you" tease | Another actor right-swiped *you* (you haven't matched yet) | Small / ambient | `.light` tick on reveal | none |
| Match celebration | Mutual right-swipe | Big / full-screen | `.success` notification | theatrical sting |

---

### 1. The Like Confirmation (micro)

Fires the instant *your* right-swipe crosses the commit threshold — **on threshold-cross, not on release** (this is where the body learns "commit"). It is intentionally small: a like is an everyday action, and confettiing it would burn the celebration budget.

**When it fires**
- The drag passes the commit threshold (or the "Read With" button is tapped, which routes through the *identical* animation).
- Right-swipe only. A left-swipe ("Not now") gets a quiet neutral-slate slide and no haptic — passing must stay emotionally weightless and invisible to the other actor.

**What happens**
- The "READ WITH" stamp (warm gold, ~15° rotated, ink-stamp feel) reaches full opacity exactly at the threshold, synced to the haptic.
- The card flies off with velocity inherited from the release — a right-swipe gets *slightly* more spin and a brief gold trail than a pass, so the affirmative gesture feels marginally more alive.
- A small toast/chip confirms the deferred reward honestly: **"Added to your bench — they're in your list now."** If the swipe carried an attached note/scene, the chip reads **"Your scene note is on its way."**
- A subtle "Bench +1" / deck-refined meter ticks up, so even a no-match swipe yields visible progress (effort recognition, not outcome recognition).

**Haptic**: `UIImpactFeedbackGenerator(.medium)` at threshold-cross. (Capacitor: `Haptics.impact({ style: ImpactStyle.Medium })`.) Pass = `.light` or none.

**Copy principles**: never "Like sent" or a heart. Frame it as *curation* — the actor is building a roster, not collecting validation. No promise of a match (that would set up a false prediction and kill the surprise when one lands).

**Anti-pattern**: do NOT confetti every right-swipe. This stays a micro-moment forever.

---

### 2. "Someone Wants to Read With You" (the tease)

This is the daily return hook and the honest curiosity gap. Another actor right-swiped you, but you haven't swiped them back yet — so the match is *partly delivered, not finished*. The brain wants to close that loop. We use that pull truthfully: the closure is **swiping, not paying**.

**When it fires**
- Surfaced as a count + context on the deck header and the "Wants to Read With You" inbox tab, with a distinct contrasting badge.
- A push notification fires on **variable but honest timing**, and ONLY for real interest — never fabricated. Reserve push for genuine value so the conditioned cue stays trusted.

**What it shows (the motivating, non-manipulative version)**
- A real count with real craft context: **"3 actors want to read with you — one does your genre, two are nearby."**
- Each incoming interest is tagged with **what they reacted to**: your monologue clip, a specific scene, a skill ("stage combat"), or a craft-prompt answer — *"A scene partner is interested in your Pinter sides."* That context is the conversation-starter, pre-loaded.
- Free tier: reveal context for all, but **full profiles unblur as you swipe your own deck** (you discover who picked you in the flow) — OR one instant reveal per day. Premium's "See who picked you instantly" is framed as a **time-saver for busy actors**, never as a gate on basic function. We never weaponize the blur into a paywall on connection.

**The micro-tease animation (only when a *new* interest arrives live, e.g. you open the app)**
- A gentle card-peek slides in from the inbox edge with the reaction tag visible; `.light` selection tick.
- Optional honest near-miss beat where it's *true*: **"Maya viewed your sides and is deciding."** Only ever surface real proximity signals (real views, real partial interest) — never manufactured "almost"s.

**Haptic**: `.light` tick on reveal. No success haptic — that pattern is reserved for the actual match so it never loses meaning.

**Copy principles**: "wants to read with you" / "interested in your sides," never "someone likes you." It's casting interest, not desirability. Identity-anchored: *a fellow practitioner respects your craft.*

---

### 3. The Match Celebration (big — the cinematic peak)

The only event that earns the full multi-sensory treatment, because it's the only one that actually advances the goal: a confirmed scene partner. Reserving the strongest reward for the rare, unpredictable mutual event is textbook variable-ratio reinforcement — *and* it keeps the moment from fatiguing.

**When it fires**
- The instant a mutual right-swipe is detected. If you're the one completing the pair (you swipe someone who already liked you), it fires immediately on your swipe. If the *other* actor completes it while you're elsewhere, it surfaces as a celebratory in-app moment next session + one trusted push.

**The anticipation beat (≈1.0–1.2s total — never block a working actor longer)**
1. The deck dims to a dark full-screen takeover (deliberate theatrical interrupt, not a banner).
2. Both headshots slide in from opposite edges and **converge toward center** — reciprocity made visual ("you both chose each other").
3. A ~0.5s hold + rising sound builds the gap-between-action-and-reward that makes the payoff feel earned, not reflexive.
4. **Resolve**: headshots meet, a craft-themed flourish fires — a **clapperboard snap / spotlight sweep / curtain reveal**, NOT hearts — and the headline lands.

**Visuals / confetti**
- `canvas-confetti` (or Reanimated) burst with randomized particle velocity, decay, and gravity, in brand warm/gold — a single tasteful burst, not a screen-filling storm.
- Theatrical motif over romantic: spotlight, clapperboard, a stage. Both headshots remain visible with their role types / shared craft hook surfaced beneath.

**Headline + copy**
- **"Scene partners!"** as the hero line. Sub-line makes it mutual and craft-framed: **"You both want to run scenes — say hi."**
- Surface a genuine shared hook to anchor the dopamine to collaboration, not attraction: *"You're both prepping self-tapes this week"* / *"Both drama-trained"* / *"You both want to drill comedic timing."*

**Haptic**: `UINotificationFeedbackGenerator(.success)` — the distinctive triple pattern reserved for real wins, fired once on the *resolve* beat (synced to the flourish), never on the anticipation. (Capacitor: `Haptics.notification({ type: NotificationType.Success })`.)

**Sound** (default OFF — actors swipe on set / in public; offer an opt-in pack): a warm, theatrical "cue" sting — stage/booth, never a casino "cha-ching."

**The single CTA — convert the spike into craft, immediately**
This is the most important part. The match screen must offer **one frictionless next action** while intent is at peak, because delay lets the impulse cool and the match goes stale:
- Primary: **"Schedule a read"** (one-tap propose-a-time) or **"Send a scene"** with a suggested 2-hander in your shared genre pre-loaded.
- If the swipe carried an attached note, that note **becomes the opening message** automatically — no blank-page "now what do I say."
- Optional one-tap **"Start a read now"** (CallKit) when both are online.

The payoff framing is always *collaboration unlocked / rehearsal queued*, never a match count to collect.

**The open loop afterward**
- A generous, non-punitive window: **"Reach out within 48–72h to lock in your read"** with a soft countdown — generous because actors aren't daily-active. A free **"Hold the slot"** extend signals "interested, just on set."
- One gentle nudge if nothing's scheduled: **"Your scene partner is waiting — propose a time."** The badge resolves into an actual rehearsal, never just more swiping.

**The piggybacked ask (peak-end, used sparingly)**
- The post-match high — and especially after the *first successful read* — is the only moment to ask for a rating, a castmate invite, or a partner testimonial. Never interrupt the swipe flow or a cold moment. Ride a genuine craft win so the ask feels earned.

---

### Build notes (React / Capacitor)

- **Haptics**: `@capacitor/haptics` — `.medium` impact for likes (threshold-cross), `.light` tick for teases, `.success` notification for matches only. Gate behind a `prefers-reduced-motion` / haptics setting.
- **Confetti**: `canvas-confetti` for web/WKWebView; mount only on the match takeover, unmount on dismiss. Single randomized burst.
- **Timing budget**: match anticipation capped at ~1.2s, dismissible by tap so it never holds a working actor hostage.
- **Sound**: default OFF, opt-in pack, preloaded `Audio` objects to avoid first-play latency; theatrical, never casino.
- **Mobile modal**: the match takeover is a full-screen modal — call `useHideMobileHeader(true)` or the top/bottom bars will clip it.
- **Navigation**: the match CTA must use the `drst-navigate` event, not react-router `navigate()`, or the button will silently no-op in the Capacitor app.
- **Honesty guardrails (enforced in code)**: teases and near-miss signals render only from real interest/view data — there is no path that fabricates "someone likes you." Left-swipes emit zero payload to the passed actor. This is the line that keeps the loop motivating for a rejection-saturated professional audience rather than manipulative.

---

## 4. Retention & Habit Loops (adapted, humane)

The dating-app playbook is built on a single engine: **variable-ratio reinforcement** — the slot-machine schedule that makes "one more swipe" compulsive. That engine works, but it optimizes for *time-in-app*, not for the actor getting better or booking the room. For a craft tool, copying it wholesale would betray the user and, ironically, retain them *worse* over the long run (dark-pattern apps score ~4.2/10 on trust vs. ~8.5/10 for honest ones). So the rule for everything below:

> **Anchor every mechanic to the actor's real goal — a rehearsed scene, a kept-warm craft, a trusted scene-partner bench — never to validation, anxiety, or fabricated urgency.** Lead with the **Rewards of the Self** (mastery) and **Relatedness** (real collaborators), not the **Rewards of the Tribe** (am-I-wanted).

Our north star, stolen from Hinge's "Designed to be Deleted": **Designed to get you into the room — together.** Success = a completed read, then the *next* one. Unlike dating, our loop is *recurring by nature* — that's a retention gift we get for free without manipulation.

---

### ✅ Adopt (humane, buildable)

**1. The mutual-match celebration — gated, craft-framed, action-forward.**
Reserve the only full-screen, multi-sensory peak (success haptic + confetti + sound) for the *rare mutual right-swipe* — this is legitimate variable-ratio restraint, not a tease, because the event genuinely advances the goal. Copy: **"Scene partners!"** with a clapperboard/spotlight motif, both headshots converging with a ~0.6s anticipation beat, a shared hook surfaced ("Both drama-trained · both prepping self-tapes"), and a single warm CTA: **"Schedule a read"** / **"Start a CallKit read now."** Do **not** confetti every swipe — over-celebration kills the signal. Tier it: swipe = micro (haptic + glyph), deck milestone = small chip, match = the cinematic moment.

**2. "X actors want to read with you" — honest curiosity, no paywall on connection.**
Show **"4 actors want to run lines with you"** with *real* reaction context ("one reads your genre, two are nearby"). Close the loop by **swiping your own deck** to discover them — the Zeigarnik tension drives craft engagement, not a fee. Premium may offer *instant reveal* as a time-saver for busy actors, but never gate the basic ability to connect. Each incoming interest is tagged with **what** they reacted to ("interested in your Pinter sides"), so it reads as casting interest, not desirability.

**3. The specific like + reciprocity opener (Hinge's strongest move).**
Right-swipes attach intent: pick a scene/genre or leave one line ("Want to run the diner scene?"). On a mutual match, that note **becomes the opening message** — killing the cold-open "hey." This raises match quality *and* triggers disclosure reciprocity. Pair with a gentle **"Your turn — [name] suggested a scene, propose a time"** nudge to convert matches into booked reads.

**4. Daily "Top Scene Partner" — one curated, compatibility-driven pick.**
One high-signal daily match on *complementary role types, overlapping availability, timezone, training level*. Framed for the work: "Today's best partner for your Shakespeare audition." The 24h refresh is our **retention heartbeat** — a genuine reason to return, not a hook.

**5. Scarce "Priority Read" token — one free/week, non-rolling, note required.**
Bumps you to the top of an actor's interest queue and signals "I specifically want to rehearse with *you*." Frame scarcity as **curation** ("spend it on someone you'll actually book studio time with"), not purchase pressure.

**6. "Spotlight" tied to a real deadline.**
Top-of-deck visibility for a window — pitched as **"self-tape due tomorrow? Get reader requests fast,"** one free/month on Premium. Urgency is real (an audition), not manufactured.

**7. "Readers Online Now" liquidity surge.**
Notify when a cluster of available partners is live (evenings, pilot season). Solves the cold-start/empty-room problem — opening the app *then* is genuinely useful, so the trigger stays honest.

**8. Craft-discipline streak — forgiving, identity-framed.**
Streak the *real* behavior: **days you kept your craft warm** (ran lines, did a read, accepted a request), not logins. Lower the bar to one minimal action ("keep your streak with one line a day"). Offer a **"Rest Day / On Set" freeze** framed as professional respect ("Booked a job? Bank a rest day"). Identity copy: **"You've trained 12 days straight — working actors stay match-fit."** Optionally, *mutual* partner streaks ("You and Maya have rehearsed 4 weeks running") that make the *relationship* the thing protected.

**9. Milestones that unlock craft value, not vanity.**
Day 7 = a free scene pack; Day 30 = a "Dedicated Partner" trust marker that earns more incoming requests; Standout placement *earned through reliability* (showing up, positive partner ratings) — a craft/reliability badge, never a looks ranking.

**10. Investment loop that visibly tunes the deck.**
After each session ask one tiny thing (tag a genre, save a partner, rate a read), then **show the payoff**: "Because you've rehearsed comedy 5×, your deck now leads with comedic readers." The compounding asset — a tuned roster + rehearsal history — is the honest moat.

**11. The satisfying gesture, craft-relabeled.**
Keep the full micro-interaction stack (drag-coupled tilt ±15°, spring snap-back, velocity throw, next-card parallax peek). Right = warm-gold **"READ WITH"** stamp + `.medium` haptic + brief celebratory spin; left = neutral slate **"PASS / Not now"** + `.light` or no haptic, silent and weightless. Never a red rejection "X." Add a **free, generous "Rewind"** (mis-flicking past a great partner is a real loss to an actor) and a **third "Bookmark / Maybe"** button — choosing a collaborator is higher-stakes than a date.

**12. Peak-end session close that launches you *out* of the app.**
Cap the deck ("12 fresh readers near you today") and end on accomplishment: **"You shortlisted 4 — go run a scene,"** with a one-tap route into the AI reader / CallKit / scene library. This is the ethical inversion of the doom-swipe: the app celebrates by sending you to *do the craft*.

**13. Honest, valuable push only.**
Reserve a distinct pleasant tone + contrasting badge for genuinely useful events: a match, a confirmed read time, "your partner sent the scene," "a Chekhov reader just joined near you." Variable timing is fine; **fake urgency is not.** Never dilute the cue with growth spam — the conditioned value collapses if the payoff ever fails to match the tease. Make frequency user-controllable.

**14. Asks timed to the genuine high.**
Request a rating, a castmate invite, or a reader testimonial **after a great read**, never mid-swipe or cold. Ride the earned craft win (peak-end effect).

---

### 🚫 Avoid (manipulative for a craft tool)

- **The match as a variable-ratio jackpot you *chase*.** Make matches feel *earned by good-fit curation* (better filters → better partners — predictable cause-and-effect). Reserve gentle surprise for *low-stakes* competence nudges, never for the connection itself.
- **Blurred-faces paywall on who likes you / on basic connection.** Curiosity to reconnect is fine; charging a fee to perform the app's core function is a dating-app shakedown.
- **Daily-likes cap as a coercion-to-pay wall.** A *soft, transparent, generous* cap that nudges thoughtful selection is good ("10 thoughtful picks a day"); a punitive cap whose only escape is upgrade is not. Show the count and reset time honestly — actors value transparency; never use deliberately vague counts.
- **Near-miss fabrication.** Only ever surface *true* proximity signals ("Maya viewed your profile and is deciding," "this reader liked you back last week"). Never invent an "almost" to juice a return. Hard ethics line.
- **Visible rejection.** Never show who *passed* on an audition-rejection-saturated population. Left-swipes are silent and invisible to the person passed over; the right-swipe is the only social signal that ever travels.
- **Aggressive 24h expiring matches / countdown anxiety.** Use a *generous* 48–72h window ("reach out to lock in your read") with a free "Hold the slot" extend — actors aren't daily-active. The goal is converting to a rehearsal, not pressure.
- **Public popularity leaderboards / "hot-or-not" ranking.** This breeds the exact self-esteem harm dating apps are criticized for. Keep all validation **private and craft-oriented.**
- **Punitive, all-or-nothing streaks** ("Don't lose your 12-day streak!"), guilt-tripping, and streak-loss catastrophe. Always provide freezes and a one-rep floor; frame as identity affirmation, not loss-aversion coercion.
- **Infinite, bottomless deck.** Removing stopping cues is the doom-swipe pattern. Always give a natural endpoint + session summary.
- **Casino sound design / "cha-ching."** Default sound **off** (actors swipe on set / in public); offer a tasteful theatrical "cue" pack. The booth, not the slot machine.
- **Over-confetti / celebration on every action** — dilutes the one moment that matters.
- **Clickbait push that doesn't deliver.** If the notification says someone picked them, that person must be on the open screen. Authenticity outperforms generic teases and protects the conditioned trust that all the other mechanics depend on.

---

**The through-line:** dating apps weaponize *wanting* (dopamine-seeking) and leave *liking* (real satisfaction) starved — endless swiping, hollow matches. Our job is to keep wanting and liking **coupled**: every seek points at a real, satisfying payoff — a rehearsed scene, a sharper self-tape, a partner who became a regular. Build on the **SDT triad** — *autonomy* (set your genre/accent/format filters), *competence* (a growing reader bench + "scenes run this week"), *relatedness* (real collaborators, craft-shared context) — so no single match-drought can flatten motivation, and the app stays a tool actors *trust*, not an attention casino.

---

## 5. Prioritized Build List for Find-a-Reader

This list is ordered by **impact × effort** — the cheapest, highest-payoff work sits at the top. Every item is scoped for the React + Capacitor stack and framed around the one north star that keeps this from becoming a dating-app slot machine: **success = two actors actually rehearse a scene together.** The swipe is a means to a rehearsal, never an end in itself.

---

### Tier 0 — Quick high-impact wins (ship this week)

These are hours-to-a-day changes that transform how the swipe *feels* without touching backend or data models.

#### 1. Threshold-cross haptics (asymmetric)
**Build:** Fire a single haptic the instant the drag crosses the commit threshold — *not* on release. Use Capacitor Haptics: `Haptics.impact({ style: ImpactStyle.Medium })` for a right-swipe ("Read with"), `ImpactStyle.Light` (or nothing) for a left-swipe ("pass"). One affirmative tick when the "READ WITH" stamp first appears (`SelectionFeedback`), one medium impact at commit. Reserve `NotificationType.Success` exclusively for a mutual match.
**Payoff:** Tactile punctuation confirms the choice through a second channel and teaches users where "commit" lives — the single cheapest way to make the gesture feel pleasurable and obeyed. Asymmetry trains the body that *seeking a partner* is the rewarded action while passing stays weightless and guilt-free.
**Effort:** ~2–4 hrs. Capacitor Haptics plugin; gate behind a `prefers-reduced-motion` / settings check.

#### 2. Drag-coupled tilt + progressive craft stamps
**Build:** Couple card rotation to horizontal drag (`rotate = clamp(deltaX * 0.05, -15°, 15°)`, pivot near the bottom edge). Fade in a stamp whose opacity maps to drag distance: right = warm gold **"READ WITH"** (or "RUN LINES"), left = neutral slate **"NOT NOW"** — never a red rejection X. Add a subtle border/glow tint bleed in the same colors for a pre-attentive peripheral cue.
**Payoff:** Turns a binary tap into a continuous, reversible preview — the dopamine is in the build-up, and the user sees the consequence before committing, which lowers anxiety. The craft-positive palette ("opportunity vs. not-this-one") removes any sting from passing on a fellow actor.
**Effort:** ~half a day with `react-spring`/Framer Motion or a `useGesture` hook. Pure FE.

#### 3. Velocity-aware fly-off + next-card promotion
**Build:** On commit, throw the card with momentum inherited from release velocity (ease-out/inertial decay, slight extra spin). Right-swipe exits with a touch more energy + a brief gold trail; left-swipe glides off quietly. Behind it, render the next card slightly scaled-down/offset and spring it up to full size on exit, with a real peek of the next reader's headshot + one craft tag.
**Payoff:** The velocity throw is the single most "satisfying" beat in the whole flow and is fully craft-neutral. The peek of the next card is a *productive* curiosity gap — "who could I work with next" — that keeps the deck feeling alive.
**Effort:** ~half a day. Same animation lib as #2.

#### 4. The "Scene Partners!" match celebration (the big moment)
**Build:** On a mutual right-swipe, a full-screen takeover: both headshots slide toward center, a ~0.5s anticipation hold ("checking if they want to read too…"), then resolve to **"Scene Partners!"** with a theatre-themed flourish (spotlight sweep / clapperboard snap — *not* hearts), `NotificationType.Success` haptic, confetti (`canvas-confetti`), and an optional sound sting. Surface a shared craft hook ("You're both prepping self-tapes this week" / "Both drama-trained"). End with **one warm CTA**: "Schedule a read" or "Send a scene."
**Payoff:** This is the textbook variable-ratio jackpot, but pointed at collaboration, not desirability. Reserving the cinematic celebration *only* for the mutual match (never for an ordinary right-swipe) keeps it surprising and meaningful — proportional celebration is what separates products people love from products they tolerate. The mutual two-headshots-meeting visual delivers the reciprocity/oxytocin beat: "they chose me back as a craft partner."
**Effort:** ~1 day. Reuses existing match event; add overlay component + confetti + one CTA route. Remember `useHideMobileHeader(true)` on the overlay or the top/bottom bars will clip it.

---

### Tier 1 — High-impact, low-friction (next sprint)

#### 5. First-message momentum window + pre-filled opener
**Build:** The match celebration's CTA drops the user straight into a chat seeded with a craft-specific opener ("Want to run my 1.5-page drama scene tonight?") or a one-tap "propose a time" / "send your sides." If the like carried a specific note (see #7), that note *becomes* the opening message.
**Payoff:** Concentrates value at peak dopamine and removes the "now what do I say" blank at the exact drop-off point. Converts the match into a booked rehearsal before the impulse cools.
**Effort:** ~1 day. Chat seeding + 2–3 template strings.

#### 6. Free, generous rewind (loss-aversion safety valve)
**Build:** A dedicated rewind control that animates the just-dismissed card back onto the top of the stack (reverse fly-off), restoring state. The restored card briefly highlights the craft tag that might warrant a second look.
**Payoff:** Missing a great potential scene partner via a mis-flick is a real loss to an actor. Making rewind **free** (not a paywalled dating-app upsell) signals the app is on the actor's side and paradoxically lets people swipe faster because mistakes are recoverable.
**Effort:** ~half a day. Store last-swiped card in state; reverse the existing animation.

#### 7. Attach-intent right-swipe (the "specific like")
**Build:** Let a right-swipe optionally tag *what* the actor reacted to — a specific self-tape, a skill ("stage combat"), a role type ("you'd be a killer Stanley"), or a craft-prompt answer — plus a one-line note ("Want to run the diner scene?"). The note travels into the match's first message.
**Payoff:** Forces signal over spray, makes the recipient feel genuinely *seen* as a collaborator, and manufactures a built-in conversation starter. Hinge's data: specific, prompt-attached likes convert dramatically better than blanket ones.
**Effort:** ~1–2 days. Lightweight note UI on commit + carry the payload through the match record.

#### 8. "Wants to Read With You" inbox (the daily return hook)
**Build:** A dedicated queue of actors who right-swiped you, each tagged with the reaction context from #7 ("interested in your Pinter sides"). Free tier sees the **count + reaction context** honestly; opening one lets you swipe back to confirm. Critically — the ethical version reveals interest to *reconnect* actors, not to extract a fee for basic function. Reserve "instant reveal all" as a Premium time-saver, never gate the core connection.
**Payoff:** The strongest pull-back hook in the genre — the reward (a match) is already partly delivered, you just have to open it. Curiosity gap + social proof ("you're wanted as a partner"), framed as casting interest rather than validation.
**Effort:** ~2 days. New inbox view + count badge + reveal flow.

#### 9. Conditioned cues, used sparingly
**Build:** A distinct, pleasant "new reader match" sound and a high-contrast badge for pending requests. Reserve push notifications for genuinely valuable events only — a match, a confirmed read time, "your partner sent the scene." Never dilute with growth spam.
**Payoff:** Classical conditioning makes the cue itself trigger anticipation — but only if the payoff is always real. For a professional audience, trust *is* the engagement engine; one fake-urgency push and serious actors tune out permanently.
**Effort:** ~half a day FE + push config.

---

### Tier 2 — Medium effort, strong retention (following sprint)

#### 10. Designed end-of-deck reward state (anti-doomswipe)
**Build:** Cap the deck per session ("12 fresh readers near you today"). When exhausted, show a craft-accomplishment close — "You shortlisted 4 partners — go run a scene" — with a CTA into the actual rehearsal product (AI reader / CallKit read / scene library), *not* an infinite refill.
**Payoff:** Peak-end rule: a satisfying, productivity-flavored finish makes the whole session feel good and respects the actor's time. This is the central lever that keeps the loop motivating-not-manipulative — the swipe graduates into practice instead of becoming a bottomless bowl.
**Effort:** ~1 day. Session cap counter + end-state component + deep links.

#### 11. "Top Scene Partner Today" daily pick
**Build:** One curated daily match — complementary role types, overlapping availability, timezone for live reads, comparable training. Refreshes every 24h. "Today's best match for your Shakespeare audition." Weight by recent activity so responsive, reliable partners surface.
**Payoff:** Scarcity + personalization + a built-in daily-return heartbeat, with success odds high enough to reinforce trust in the system. Framed around the *work*, not desirability.
**Effort:** ~2–3 days incl. a simple compatibility score on BE.

#### 12. Scarce "Priority Read" token (weekly, non-rolling)
**Build:** One free "I really want to read with YOU" token per week, note required, that bumps you to the top of that actor's interest queue and flags genuine intent. Frame scarcity as curation ("spend it on a partner you'll actually book studio time with"), not purchase pressure.
**Payoff:** Costly-to-fake signaling makes the gesture meaningful for the sender (selectivity) and flattering + informative for the recipient (real rehearsal intent, not a casual swipe).
**Effort:** ~2 days. Token ledger + priority placement in the inbox.

#### 13. Craft prompts replace freeform bios
**Build:** Three curated craft prompts ("A role I'd kill to rehearse…", "My technique in one line…", "The scene I could run a hundred times…", "A skill I bring to a tape…") plus a short self-tape clip and an optional voice-prompt monologue snippet. These become the swipeable, likeable units that #7 reacts to.
**Payoff:** Structure beats blank-page paralysis, orients the whole match around the work rather than appearance, and gives others specific, low-risk hooks to react to — which raises match quality across the deck.
**Effort:** ~2–3 days (profile editor + deck card layout).

---

### Tier 3 — Higher effort, identity & habit layer (when there's daylight)

#### 14. Craft-discipline streak (forgiving, identity-framed)
**Build:** A streak on *keeping your craft warm* — a read, a line into the AI reader, or accepting a request counts. Minimum bar = one tiny action ("keep your streak with just one line a day"). Include an "On Set / Rest Day" freeze framed as professional respect ("Booked a job? Your streak's safe"). Frame as identity: "Working actors stay match-fit."
**Payoff:** Loss-aversion habit anchor pointed at the real-world behavior actors *want* (regular rehearsal), not empty app-opens. The freeze turns a retention mechanic into genuine brand goodwill with a working-actor audience.
**Effort:** ~3 days. Streak model + freeze logic + identity copy. **Avoid** any guilt-trip "don't break your streak!" framing — pros detect and resent coercion.

#### 15. Investment loop made visible ("your deck gets better")
**Build:** Let actors save partners to a "bench," rate completed reads, and tag scene goals — then *show* the deck adapting: "Because you've rehearsed comedy 5×, your deck now leads with comedic readers." On a left-swipe, occasionally surface honest taste-tuning: "Got it — fewer comedic readers, more dramatic."
**Payoff:** Converts invisible data events into felt competence + autonomy rewards (SDT), builds compounding stored value (a tuned roster + rehearsal history) that is the real moat, and makes even a zero-match session pay off because the *pass* visibly sharpened the feed.
**Effort:** ~4+ days. Preference model, deck re-ranking, "why am I seeing this" transparency surface.

#### 16. "Readers Online Now" liquidity surge
**Build:** Notify actors when a cluster of available partners is live (evenings, pilot/audition crunch): "High reader activity right now — find a partner in minutes." Participants get queue priority during the window.
**Payoff:** Solves the cold-start/empty-room liquidity problem (matches need both people active) and gives a *legitimate*, non-manipulative reason to open the app at a genuinely useful time.
**Effort:** ~3–4 days incl. presence tracking + scheduled push.

---

### Guardrails (apply to every item above)

- **Never show who passed.** Left-swipes are silent and invisible to the person passed over — actors are a rejection-saturated population; shield them from one more visible "no."
- **No fabricated signals.** Near-miss / "deciding" / "viewed you" cues must be *true* proximity signals, or they read as deceptive to a professional audience and torch trust.
- **Keep the core free.** Finding a human to rehearse with never sits behind a paywall. Scarcity nudges *selectivity*; Premium unlocks power features (filters, instant reveal, unlimited Spotlights) — not basic connection.
- **Celebrate proportionally.** Micro (haptic) per swipe, small (chip) per deck milestone, cinematic *only* for the mutual match. Over-confetti and the jackpot stops feeling like one.
- **Lead with Self over Tribe.** Anchor rewards to the actor's own craft growth ("scenes rehearsed," "your bench is deep"), not popularity. No public leaderboards — that breeds the self-esteem harm dating apps are infamous for.

Relevant code to touch lives in the Find-a-Reader swipe component and the match-event handler in the FE app (App.jsx and the deck/match modules). The mobile-modal and mobile-navigation gotchas apply: the match overlay must call `useHideMobileHeader(true)`, and any in-app routing from a CTA must use the `drst-navigate` event rather than react-router `navigate()`, which no-ops on Capacitor.

---

## Do-Not-Do

Manipulative patterns to avoid for a professional tool. These are hard ethics lines — for a rejection-saturated, professional audience, violating any one of them torches the trust that every other mechanic depends on.

- **Never fabricate social signals.** No "someone likes you" bait, no invented "almost!" near-misses, no manufactured "X is deciding." Every tease, view, and proximity cue must render from *real* data only — there must be no code path that can fabricate interest.
- **Never show who passed on you.** Left-swipes emit zero payload to the person passed over; the right-swipe is the only social signal that ever travels. Actors get enough rejection — don't add one more visible "no."
- **Never paywall basic connection.** No blurred-faces shakedown, no "pay to see who wants to read with you" as the *only* path to connect. Premium unlocks power features (filters, instant reveal, unlimited Spotlights), never the core ability to find a human to rehearse with.
- **Never use a punitive likes cap.** A soft, transparent, generous cap that nudges thoughtful selection is fine; a coercive cap whose only escape is upgrade is not. Always show an honest count + reset time — never deliberately vague numbers.
- **Never chase the match as a slot-machine jackpot.** Make matches feel *earned by good-fit curation* (better filters → better partners — predictable cause-and-effect). Reserve gentle surprise for low-stakes competence nudges, never for the connection itself.
- **Never run aggressive expiry / countdown anxiety.** No 24h expiring matches. Use a generous 48–72h window with a free "Hold the slot" extend — actors aren't daily-active, and the goal is a booked rehearsal, not pressure.
- **Never build public popularity leaderboards or hot-or-not ranking.** Keep all validation private and craft-oriented. Public ranking breeds the exact self-esteem harm dating apps are criticized for.
- **Never ship punitive, all-or-nothing streaks.** No "don't lose your 12-day streak!" guilt-tripping or streak-loss catastrophe. Always include freezes and a one-rep floor; frame as identity affirmation, not loss-aversion coercion.
- **Never build an infinite, bottomless deck.** Removing the stopping cue is the doom-swipe pattern. Always cap the session and end on a craft-accomplishment summary that routes *out* of the app into real rehearsal.
- **Never use casino sound design.** No "cha-ching," no slot-machine audio. Default sound off; offer a tasteful theatrical "cue" pack. The booth, not the casino.
- **Never over-celebrate.** No confetti on ordinary swipes — reserving the cinematic moment for the mutual match is the only thing that keeps it meaningful.
- **Never use red, an X, or rejection language on a pass.** "NOT NOW" / "PASS" in neutral slate — passing is curation, never a verdict on a fellow actor's worth.
- **Never ship clickbait push.** If a notification says someone picked them, that person *must* be on the open screen. Authenticity protects the conditioned trust the whole loop runs on.
