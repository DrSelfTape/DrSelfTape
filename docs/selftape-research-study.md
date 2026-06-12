# Dr Self Tapes — Self-Tape Performance & Production Research Study

This study analyzes a corpus of 110 professional self-tapes produced through the Dr Self Tapes (DST) studio, covering roughly 25–30 distinct actors across genres ranging from grounded drama and distress-thriller to sports comedy, commercial, and a high-difficulty sad-clown character set. The tapes were swarm-analyzed on a per-clip basis, with each entry scored for framing, lighting, eyeline, energy, commitment, and tone, and annotated with standout beats, strengths, and mistakes. Because nearly every tape was shot on the same two-LED-panel rig against a small menu of house backdrops, the corpus functions as a rig-controlled benchmark: production variables are held nearly constant, isolating performance and technical discipline as the things that actually vary. What follows synthesizes that analysis into operational conventions, a performance playbook, a tone taxonomy, the DST house-look brand standard, and a product roadmap for the AI self-tape analysis feature.

## Executive Summary

- **Energy level does not predict commitment.** Restraint and explosion score equally when the choice is specific — the single highest-commitment cluster in the corpus is a *low-energy* sad-clown character (commitment 9 across every take). Specificity and follow-through, not volume, are what casting remembers.
- **The most common single failure is physical commitment outrunning a static lock-off.** The corpus's most emotionally committed performers (Nikki P Love, Colin McCalla, Kevin Burney) are precisely the ones who blow the frame on big beats. A one-size-looser safety frame would protect exactly the takes that deserve protecting.
- **The cardinal self-tape sin — eyes drifting to a monitor or reading device — is essentially absent** from the entire corpus. This is an experienced, well-coached pool, which makes eyeline discipline the single most reliable craft strength on the slate.
- **Reader proximity to the lens equals intimacy.** Tight, near-axis off-lens eyeline is consistently rewarded; wide reader placement reads "theatrical" and leaks the energy sideways (Nikki P Love S4, Alex Luna take 6 both lose marks for it).
- **The top-scored tapes play an arc, not a state.** The most decorated reads (Esa Stallworth, Naomi Baker, David Schrock, Nicolas Wilson) travel through 3–4 distinct, earned emotional colors inside one continuous take; staying in a single emotional lane is consistently flagged as a ceiling.
- **The DST house look is strikingly uniform and benchmarkable.** ~90% of the corpus shares one two-panel LED rig on muslin or saturated-blue seamless, with `lighting_quality` clustering tightly at 8. The slate tapes literally photograph the rig, giving the app ready-made ground truth for a calibrated "house-look gap" report.
- **Multi-take clusters with per-take scores make auto-take-ranking a solved problem, not an ML moonshot.** Coach, MaryBeth, Mateo, Chris, Gabriel, June, Luna, and Claire all provide same-actor/same-scene take pairs with written rationales — the headline "your TK2 beat TK1" feature is directly demonstrable on this dataset today.
- **The corpus catches real delivery defects, not just aesthetics.** Two Ryan Vincent files (take 5) are corrupt past the opening GOP — proving a cheap automated file-integrity check would catch broken tapes before they ever reach a casting director.

## How Self-Tapes Operate: Structure & Conventions

The 110-tape corpus resolves to 96 analyzed clips covering roughly 25 distinct actors. Stripped of duplicate re-analyses, the operational picture is remarkably consistent: this is a single facility ("the HOUSE" / Dr Self Tapes studio) running a repeatable two-panel lighting plot and a small menu of backdrops, producing two clearly differentiated deliverable types — identification **slates** and **scene takes**.

### Slates vs. Scene Takes: the Two-Part Structure

Of the analyzed clips, **9 are slates** (`is_slate: true`) and the rest are scene/monologue takes. The split is operationally clean: slates are short identification cards (Kevin Burney 13.05s, Alex Luna 13.56s, Arlene Conrad 12.05s, Esa Stallworth 9.1s, Marcus Ray 9.8s, Naomi Baker 12.35s, Krystal Mosley 5.09s), and they follow a rigid internal grammar.

The canonical slate is **two-part**: a tight chest-up MCU or CU for the verbal ID, then a cut/pull to a **full-length WS** "size card" showing the whole standing figure. Arlene Conrad's slate is described as the reference instance — "opens chest-up MCU... then cuts/pulls to a full-length wide showing the whole body for the size card." Aida Rodriguez's, David Schrock's, Esa Stallworth's, Marcus Ray's, and Naomi Baker's slates all repeat this MCU/CU-into-WS move exactly. Eyeline on slates is **direct-to-lens** (no reader involved), versus the off-lens reader eyeline of every scene take — a hard, reliable discriminator. Krystal Mosley's 5.09s WS-only slate is the lone outlier (a body card with no close ID), confirming the structure is a convention, not a hard rule.

A useful operational byproduct: the WS half of each slate **documents the rig**. Three separate slates (Arlene Conrad, Alessandra Scotto, Naomi Baker, Krystal Mosley) explicitly reveal "two matched LED softpanels flanking at ~45°" on a muslin backdrop — the house signature.

### Shot-Size Distribution

Scene takes cluster hard at **MCU (medium close-up), chest-up** — this is the house default and the single most common framing in the corpus by a wide margin. MCU dominates the dramatic and monologue material: every Aida Rodriguez scene take, all Claire Heyler-Erickson monologues, the David Schrock Mateo scenes, the Esa Stallworth June scenes, the Nico Jones Chris takes, and the Alessandra Scotto Leah takes are all chest-up MCU.

Shot size loosens **only to accommodate physicality or costume**, and the data shows this is a deliberate, motivated choice rather than sloppiness:
- **MS (medium shot)** appears on every Simon Sorrells "Coach" take — explicitly "to accommodate active hand gestures," crossed arms, and pointing.
- **MS/MWS** is used for Miska Kajanus's clown takes — "wider than the house norm... to include the full costume (clown suit)" and pointed hat.
- **MWS** appears on the most kinetic performers: Tim Herkenhoff's hotel-guest commercial (waist-up, prop glass, blocking to camera-left), Ryan Vincent's lunging 195s and 170s takes, and Colin McCalla's pacing/back-turn Gabriel takes.
- **CU** is reserved almost entirely for slates (the close ID).

The principle the corpus reveals: **frame to the action**. Tight MCU is the resting state; the operator opens up by one size only when the performance demands arm room.

### Framing Conventions: Centering, Headroom, Consistency

The house standard is **centered subject, comfortable headroom, eyes on the upper third, locked-off.** The strongest tapes are explicitly described as "rock-steady," "locked-off," "no drift" — Esa Stallworth's June S2T1 ("locked-off and stable. Long braids frame the face symmetrically"), Nico Jones's S2T2 ("locked-off and steady — no drift"), and David Schrock's 156s and 149s Mateo takes which hold "dead-steady" across a 2.5-minute run.

Deliberate off-center composition appears as a *character* choice, not an error: the Alessandra Scotto "Leah" takes sit camera-right of center with intentional negative space on the left for the opening flirtatious lean.

The recurring framing **failure mode** is physical performance outrunning a static lock-off. The corpus contains several named instances:
- **Nikki P Love (S1)** — "by 85% she has turned a near-full profile and dipped so low she nearly exits the bottom of frame... strong physical performance that outruns the lock-off."
- **Colin McCalla (Gabriel SC2TK1)** — drops "almost entirely out of frame (only the top of the head visible)" on a collapse beat.
- **Kevin Burney (Security Guard T3)** — "drops his head into his hands and partly exits the top/side of frame."
- **Colin McCalla (Gabriel SC3TK1)** — the action take "badly mis-framed" at the open, "only the top of the head visible at the bottom edge."

The lesson these reveal operationally: **when blocking is big, frame wider or rehearse the lock-off** — the most committed emotional/physical performers are precisely the ones who blow the frame, and a one-size-looser safety frame would protect them.

### Take Patterns: How Many Takes, and What Varies

Multiple takes of one scene are common, and the corpus lets us see exactly what actors vary between them:

- **Aida Rodriguez (MaryBeth)** runs the widest take coverage: SC1TK1 (103s), SC1TK2 (107s), SC2TK1 (67s), SC2TK2 (70s), SC4 (23s), plus a slate. Between SC1TK1 and SC1TK2 the *blocking and prop business hold* (both feature the mid-scene phone-handling beat at ~65%), but the emotional coloring shifts — TK2 opens with "a warm amused beat" and adds "a slight smirk" on the lift back to camera that TK1 plays straighter. The variation is **register and button**, not staging.
- **Simon Sorrells (Coach)** has the most takes of any performer — SC1TK1, SC1TK4, SC2TK3, SC2TK4, SC3TK1 — and reveals **escalation as the variable**. SC2TK4 is explicitly "a hotter take than TK3 — more animated and physical," pushing the same crossed-arms-to-point coach beats "louder." The character, wardrobe (cap + white polo), and gesture vocabulary stay fixed; what varies between takes is **energy level and broadness** (deadpan-dry in SC2TK3, blustery in SC2TK4).
- **Claire Heyler-Erickson** offers a monologue comparison: Monologue1 Tk1 (73s) and Tk2 (79s), Monologue2 Tk1 (79s) and Tk3 (84s). Across takes she varies **emotional depth and projection** — Tk2 of Monologue1 "deepens to pained and pleading mid-piece" where Tk1 "stays in a narrow emotional band... could use more dynamic range."
- **Nico Jones (Chris)** runs S1, S2, S2T2, S2T3 — varying the **physical button**: S2T3 ends on a "talk-to-the-hand" dismissal, S2 on an open-palmed shrug, while S2T2 plays "quiet and sincere... leaning on stillness."
- **Nikki P Love** (S1, S2, S4), **Alex Luna** (takes 2, 3, 4, 6, 7), and **Esa Stallworth** (S1, S2T1, S2T2) each provide multiple emotional passes at related material, varying intensity and physical release.

A distinct pattern worth flagging: **two different actors reading the same role** — Alessandra Scotto and Krystal Mosley both tape "Leah." The corpus notes this directly as a casting comparison: "Mosley plays it warmer/more sensual, Scotto more flirty-playful." This is the studio supporting side-by-side audition comparison, not an actor's own retake.

The take-count rule of thumb the data supports: **expect 2–5 takes per scene**, with takes preserving staging/prop business while varying emotional register, energy level, and the closing button.

### Duration Norms

Slates run **5–14 seconds** (median ~12s). Scene takes span a wide range but cluster by genre:
- **Short reaction/emotional beats**: 19–46s (Miska Kajanus clown takes 19.85–39.83s; Nikki P Love 21–23s; Alex Luna 27–46s).
- **Standard dialogue/monologue takes**: ~50–120s — the bulk of the dramatic material. Monologues run consistently long (Claire Heyler-Erickson 73–84s; Alessandra Scotto Leah 118–119s).
- **Extended showcase takes**: David Schrock's Mateo takes are the longest scene work at **156s and 149s** (2.5 min), sustaining commitment across a single continuous take; Ryan Vincent's run **195s and 170s**.

The norm: **most scene takes land between 45s and 2 minutes**; anything over 2.5 minutes is a deliberate stamina showcase.

### Operational Best-Practices the Tapes Reveal

1. **Standardize the look, vary the backdrop.** One two-panel LED plot runs across the whole corpus; backdrop is the controlled variable — saturated royal-blue seamless ("HOUSE blue" cyc), and mottled muslin in grey/charcoal, warm brown/sienna, olive-green, and amber/tan. Lighting is consistently soft, frontal, low-contrast, camera-left-biased. The best-graded tape (David Schrock, lighting 9) uses the warm olive muslin for a "Rembrandt-ish," cinematic, period-coded look — proving the rig flexes to genre by backdrop and key warmth alone.

2. **Match backdrop to genre.** Warm muslin reads period/intimate; saturated blue reads commercial/sitcom-clean (used for Tim Herkenhoff's hospitality spot and all the comedic Coach takes); low-key near-black is reserved for the horror/dark-comedy clown character.

3. **Discipline the eyeline.** Off-lens reader placement close to the lens axis is near-universal; eyeline only breaks for motivated beats (Alex Luna's upward pleading look, Nikki P Love's turn-away). The data treats wandering-to-monitor as the cardinal sin — and notably, almost no tape commits it.

4. **Frame for the body when the body is the performance.** The single most repeated technical note is that big physical commitment breaks a tight lock-off; the operationally mature tapes (Anthony Sayo holding frame through a full profile turn; Simon Sorrells's motivated MS) pre-size for the movement.

5. **Slate hygiene is fixed and fast.** Direct-to-lens ID, then a clean full-body size card, under 15 seconds — the WS doubling as rig documentation.

6. **Check the deliverable.** Two Ryan Vincent files (take 5) are flagged as **corrupt past the opening GOP** (FFmpeg NAL-unit errors), scoring technical_quality 4 — a real export defect the corpus catches, underscoring that a final integrity check on the file is part of the operation, not an afterthought.

## Performance & Line Delivery: How Actors Act on Tape

This section analyzes how the 110 tapes in the corpus actually perform on camera — the choices actors make in delivery, eyeline, business, and emotional modulation — and distills the patterns that separate the strongest reads from the weakest. Across the corpus, mean commitment scored 8.3/10, and the standout-beat field is almost universally a *performance* moment, not a technical one — a useful signal that on this slate, acting choices, not lighting or framing, are what casting will remember.

### Energy and Commitment Patterns

The corpus splits cleanly into three energy registers, and the most instructive finding is that **energy level does not predict commitment** — restraint and explosion score equally when the choice is specific.

- **High energy** dominates the emotionally extreme and comedic tapes: Alex Luna's distress takes (commitment 9), Esa Stallworth's June (9), Ashli (9), Nikki P Love's breakdown takes (9), Ryan Vincent's kinetic confrontations (9), and the louder Coach alts (Simon Sorrells SC2TK4, 9). These actors push to the edge of the emotional range and stay there.
- **Medium energy** is the modal register and houses the most controlled work: Aida Rodriguez's MaryBeth takes (8 across the board), David Schrock's Mateo (9), Anthony Sayo (8), the Alessandra Scotto / Krystal Mosley "Leah" reads (8).
- **Low energy, high commitment** is the corpus's quiet lesson. Miska Kajanus's sad-clown take 1 is logged at *low* energy but commitment 9 — "somber, heavy-lidded, weary delivery... total stillness and committed deadness behind the eyes." Claire Heyler-Erickson's Monologue2 Tk1 is low-energy/commitment 7. Stillness is not the same as disengagement, and the analysts repeatedly reward actors who trust it.

The single highest-commitment cluster in the entire corpus is Miska Kajanus's clown character — every one of his takes scores commitment 9 regardless of energy, because the choice (playing mournful pathos *against* a comic costume) is fully embodied and never breaks. The practical takeaway: commitment is a function of specificity and follow-through, not volume.

### Eyeline Discipline: Reader Position and Lens Proximity

Eyeline is the most consistently strong technical-craft element in the corpus, and the pattern is unambiguous. The dominant, rewarded configuration is **reader placed just off-lens to camera-left (occasionally camera-right), close to the barrel, with the actor holding a tight, consistent off-lens line.** This phrasing recurs almost verbatim across the strongest scene tapes — Aida Rodriguez, Nico Jones, David Schrock, Esa Stallworth, Anthony Sayo, Marcus Ray, Geovanni Gill.

Key sub-patterns:

- **Tight reader proximity is praised; wide reader placement is flagged.** David Schrock's Mateo (SC2TK1) holds a "tight near-lens eyeline... near-axis so it nearly reads as direct address" across a 2.5-minute take — graded a 9. By contrast, Nikki P Love's S4 places the reader "well off-lens camera-right" so she plays "mostly in profile/three-quarter," which the analyst marks down as "more theatrical staging than tight self-tape discipline," costing the read. Alex Luna's take 6 similarly logs a reader positioned "fairly wide of lens," with eyeline drifting to the side. **Proximity to lens equals intimacy; distance leaks the energy sideways.**
- **Breaking eyeline is fine when it is a performance choice, not a lapse.** The analysts are careful to distinguish the two. Alex Luna's upward look at the 85% mark "reads as an emotional reach rather than a discipline lapse." Nikki P Love covering her eyes and turning away is "intentionally abandoned for the physical beat rather than lost to indiscipline." Nico Jones S2T2's downward glances are "used as listening/processing, not as energy drops." Every actor in the strong tier *re-establishes* the line after a break — David Schrock "keeps re-finding the scene partner" even through tearful head-drops.
- **Monologues correctly shift the eyeline target.** Claire Heyler-Erickson's monologue tapes play "direct-to-lens / very slightly camera-right" or "up-and-off... as if conjuring a memory," which the analysts read as appropriate monologue address rather than a two-hander reader position — and note approvingly that she never drifts to her own monitor.
- **Deliberate lens engagement is a tool for menace.** Colin McCalla aims a prop gun "dead-center into the lens" and Miska Kajanus's clown holds an "unblinking near-lens stare" — both intentional breaks of the off-camera convention that heighten threat. The discipline note is that these are *controlled* breaks, locked to a target, not wandering.

The corpus contains essentially **zero** cases of the cardinal self-tape sin — eyes flicking to a reading device or monitor. That absence is itself a finding: this is an experienced, well-coached pool.

### Prop and Physical Business

Prop work is one of the clearest dividing lines between competent and cinematic on this slate, and the standout examples are worth naming because they model how to do it.

- **Aida Rodriguez's phone business** is the corpus's gold standard for naturalistic prop use. Across SC1TK1 and SC1TK2 (her standout beat in both), she "fully commits to reading the device, letting a real reaction land before lifting back to the reader" — eyes dropping, muttering into the phone, "a genuinely cinematic naturalistic moment... real, not indicated." The lesson: a prop earns its place when the actor lets it generate a *reaction*, not when it's merely handled.
- **Colin McCalla's prop handgun** (SC3TK1/SC3TK2) shows committed prop discipline in an action register — "extends the weapon at full arm into the lens, holds a hard predatory stare," with steady aim that he "keeps alive by micro-adjusting intent" rather than letting a sustained point go static.
- **Tim Herkenhoff's water glass** anchors a relaxed commercial-guest beat and signals a scene/time jump; **Colin McCalla's collar-tugging and wrist/sunglasses business** give a brooding romantic read "a concrete piece of physical business to land on"; **Anthony Sayo's deliberate two-hand "framing" gesture** to camera is praised as "confident, motivated business that breaks up a talking-head."

The richest *physical* vocabulary belongs to the Coach tapes (Simon Sorrells): the recurring crossed-arms-to-open-palm / finger-jab escalation is repeatedly cited as a clean physical map of "a Coach visibly losing patience," with body language doing the characterization. The caution: when gesture becomes constant — Arlene Conrad's hands "repeatedly enter the bottom corners," Kevin Burney's "big physicality occasionally costs him framing" — the business starts to crowd the frame.

### Emotional Range Within and Across Takes

The corpus strongly rewards actors who play **an arc inside a single take** rather than a flat read. The most decorated tapes are precisely the ones with the widest within-take range:

- **Esa Stallworth's June (S1)** is the benchmark: "four distinct emotional colors in one take" — opening confrontation, a full open-mouthed laugh leaning into camera, a cold narrowed-eye skeptical glare, then a tender half-smile — "she earns each transition." Her standout is "the full-bodied lean-in laugh that immediately hard-cuts to a cold skeptical glare — total tonal command."
- **Naomi Baker's Tara (S1)** mirrors this — coy look-down → big laugh → confident grin → "a sharp pivot to concern/hurt vulnerability... she sells the turn completely."
- **David Schrock's Mateo** modulates "between restraint and the break," landing a genuine break into tears that re-gathers into "steely resolve."
- **Nicolas Wilson's Eddie (S1T2)** runs "clenched menace to a disarming closing smirk — full emotional range inside one continuous take."

Across takes of the same role, the corpus offers a casting-grade comparison: the two "Leah" reads (Alessandra Scotto plays it "flirty-playful," Krystal Mosley "warmer/more sensual") and the multiple Coach alts (Simon Sorrells's SC2TK3 dry/deadpan vs. SC2TK4 "a hotter take... pushing the scene louder") demonstrate that strong actors give casting *tonal options* rather than repeating one read.

The counter-pattern — staying in one emotional lane — is consistently noted as a ceiling. Ryan Vincent's S2 "stays in one emotional lane (suspicion)... less range shown than e.g. Esa Stallworth, but the lane is well-played." Claire Heyler-Erickson's monologues "stay in a narrow emotional band... could use more dynamic range." Alex Luna's high-distress takes draw the note that "the pitch sits high the whole take with little dynamic valley." Range, where it exists, is the differentiator.

### Most Common STRENGTHS Across the Corpus

1. **Disciplined, near-lens eyeline.** The overwhelming majority hold a tight, consistent off-lens line to a close reader, and never drift to a monitor — the single most reliable craft strength in the pool.
2. **Listening between lines.** Repeatedly praised as a marker of experience — Aida Rodriguez's "engaged listening," Alessandra Scotto's "real listening beats," Aida's frame-4 turn-away that "shows real scene-partner awareness rather than waiting for a cue," Nico Jones reacting "rather than waiting." Reactions land *between* the lines, not just on them.
3. **Genuine, accessed emotion over indicated emotion.** "Real, not indicated" / "earned, not performed" is the recurring high compliment — Alex Luna's "genuinely welled-up eyes... real emotional access, not performed crying," David Schrock's "genuine wet-eyed emotion, not indicated," Esa Stallworth's pressed-lip swallow "without any indicating."
4. **Specific, committed character transformation.** Miska Kajanus's full sad-clown is the apex, but Marcus Ray's "restrained menace... threat lives under the surface" and the instantly legible Coach archetype are the same instinct: a clear, embodied character.
5. **Within-take arc and clean emotional gear-changes.** The most-rewarded actors visibly *travel* across the take.

### Most Common MISTAKES Across the Corpus

1. **Big physical choices that outrun the frame.** This is by far the most frequent flaw. Nikki P Love "works so big that she nearly leaves frame at the climax" (technical_quality dropped to 6); Colin McCalla's full-body collapse drops him "almost entirely out of frame"; Kevin Burney's head-in-hands beats and ducking "momentarily break framing." The fix the analysts repeatedly name: a slightly wider safety frame for physically big takes, or a rehearsed lock-off.
2. **Pushing / over-indication at the emotional peak.** Ashli "borders on pushing in the angriest beat" (her quieter reaction is "the most truthful"); the broad Coach scowls "flirt with over-indication"; Geovanni Gill's eyebrows "occasionally border on broad"; Alex Luna's distress risks tipping "toward indicated distress." The corpus consistently rates the *restrained* beat as more truthful than the loud one.
3. **Staying in a single emotional lane.** Flagged for Ryan Vincent, Claire Heyler-Erickson, and Alex Luna — a narrow band reads as a ceiling even when the lane is well-played.
4. **Reader placed too wide / off-center staging.** Nikki P Love's S4 and Alex Luna's take 6 lose intimacy by pulling eyeline and body to the far side.
5. **Broad gesturing that crowds a tight frame.** Arlene Conrad, Kevin Burney, and the busier Coach takes show gesture vocabulary outrunning the chest-up MCU.

### Practical Guide to Strong On-Tape Acting (Distilled From the Corpus)

- **Put the reader as close to the lens as possible** and hold the line. Off-lens camera-left, near the barrel, is the proven default. Wide placement reads theatrical and drains intimacy.
- **Break eyeline only on a motivated beat, and always re-find the partner.** The corpus rewards intentional breaks (looking up to plead, away in grief) and punishes wandering — re-establish the line every time.
- **Play an arc, not a state.** The top-scored tapes (Esa Stallworth, Naomi Baker, David Schrock, Nicolas Wilson) all travel through 3–4 distinct, earned colors in one take. Give casting tonal options across multiple takes.
- **Earn the emotion; never indicate it.** Genuine welled eyes, a real swallow, a true micro-grimace consistently outscore pushed crying or broad mugging. When in doubt, the quieter beat is more truthful.
- **Use props to generate reactions, not to fidget.** Aida Rodriguez's phone is the model — drop in, let a real reaction land, lift back to the partner.
- **Size the choice to the frame.** If a beat is physically big (a collapse, a turn-out, a lunge), frame wider or rehearse the lock-off so commitment doesn't cost composition — the corpus's most common single failure.
- **Trust stillness.** Low energy with full commitment (Miska Kajanus, the strong monologues, David Schrock's closed-eyes pauses) is a legitimate and frequently superior choice to constant motion.

## Tone & Genre Taxonomy

This taxonomy is built from the `tone_tags`, `genre_guess`, and `performance_notes` of the 94 scored scene takes in the corpus (slates excluded from performance analysis). Across those takes, `tone_tags` cluster into seven recurring registers. The most common single tag is **intense** (appearing on ~38 takes), followed by **grounded** (~33), **confrontational** (~30), **vulnerable** (~22), **dramatic** (~22), **comedic** (~16), **warm** (~15), and **deadpan** (~12). Those clusters resolve into the seven coaching categories below. Each is defined by what it actually looks like on tape in this corpus — energy level, eyeline behavior, and delivery — and anchored to named example tapes.

---

### 1. Grounded Drama (the corpus baseline)

**What defines it on tape:** Naturalistic, text-driven delivery with controlled emotional shifts and real listening between lines. This is the default register of the corpus — the tag `grounded` co-occurs with `dramatic`, `earnest`, and `warm` more than any other combination. Reactions land *between* lines rather than on them; subtext does the work.

**Energy / eyeline / delivery:** Energy is **medium** almost without exception (Aida Rodriguez, Nico Jones, David Schrock, Anthony Sayo all sit at `energy: medium`). Eyeline is tight, disciplined, just off-lens to a close reader (`"close to lens and stays disciplined"`), held steadily for the full take with no wandering. Delivery is restrained and specific; gear-changes are internal (Nico Jones SC1: `"shift from clipped confrontation to a quieter, wounded line-read — a clean emotional gear-change"`).

**Example tapes:**
- **AidaRodriguez_MaryBeth_SC1TK1** — `["grounded","dramatic","warm","intense"]`, medium energy, the phone-prop business beat at 65% as a model of naturalistic specificity.
- **DavidSchrock_Mateo_SC2TK1** — `["grounded","dramatic","intense","earnest","confrontational"]`, the corpus's highest-craft grounded work: `"Wide dynamic range without ever tipping into ham,"` eyes-closed weighted pause as the standout.
- **Nico Jones_Chris_S1** — `["grounded","confrontational","intense","earnest"]`, everyman olive crew tee, `"restrained, believable choices."`

---

### 2. Intense / Confrontational

**What defines it on tape:** Rising heat played through escalation — a wary or guarded open that builds into accusatory, gesturing argument. `confrontational` and `intense` are the corpus's most entangled pair, and they almost always travel with a visible *arc* (defensive open → active push). This is grounded drama with the dial turned up and the stakes externalized.

**Energy / eyeline / delivery:** Energy is **high or rising** (Simon Sorrells `energy: high`, Esa Stallworth `energy: high`, Ryan Vincent `energy: high`). Eyeline stays anchored to the reader even during big gestures (`"reactive looks stay anchored to the reader position even during the big gesture"`), and on the menacing variants it locks down-lens. Delivery escalates physically: crossed arms unfolding to open palms, jabbing fists, leaning in. The threat variant (menacing/predatory) lowers energy into stillness and aims a cold stare at the lens.

**Example tapes:**
- **SimonSorrells_Coach_SC1TK1** — `["confrontational","intense","grounded","commanding"]`, the `"arms-crossed-to-open-palms escalation"` mapped cleanly in body language.
- **Nico Jones_Chris_S2** — `["confrontational","grounded","exasperated","intense"]`, builds to an emphatic open-palmed `"what do you want from me"` beat.
- **ColinMcCalla_Gaberiel_SC3TK1** (menacing variant) — `["intense","confrontational","dramatic","menacing"]`, gun-prop standoff, `"dead-level, predatory stare over the gun barrel."`
- **RyanVincent_1** — `["agitated","intense","confrontational","physical","volatile"]`, sustained kinetic intensity over a 195s take.

---

### 3. Vulnerable / Distraught

**What defines it on tape:** High-stakes emotional exposure — tears, breath catching, pleading. This register splits into two sub-modes the corpus separates clearly: **hot distress** (`distraught`, `pleading`, `distressed` — on the verge of or in tears) and **restrained vulnerability** (`vulnerable`, `wounded`, `restrained` — emotion held *under* the surface).

**Energy / eyeline / delivery:** The hot sub-mode runs **high energy** (Alex Luna `energy: high`, Nikki P Love `energy: high`) and frequently *breaks* eyeline as a deliberate emotional choice — an upward pleading look to an imagined figure of power (Alex Luna: `"upward eyeline... reads as appealing to someone with power over her"`), a hand-over-eyes collapse, a turn-away. The restrained sub-mode runs **medium-to-low energy** (Esa Stallworth `energy: medium`, Claire Heyler-Erickson `energy: low`) and keeps eyeline on-axis with closed-eyes gathering beats. Caution flag the corpus repeatedly raises: the hot mode `"sits high the whole take with little dynamic valley"` and risks `"indicated distress."`

**Example tapes:**
- **Alex Luna_4** — `["vulnerable","intense","dramatic","distraught"]`, `"barely-held-together desperation"` and genuinely welled-up eyes.
- **Esa Stallworth_June_S2T1** (restrained sub-mode) — `["vulnerable","grounded","pained","restrained","wounded"]`, the `"pressed-lip swallow... fully internalized, held-back hurt that lands without any indicating."`
- **Nikki P Love_S1** — `["distraught","grief","vulnerable","intense","dramatic"]`, hand-over-eyes-into-collapse; note the technical cost (`technical_quality: 6` — she nearly leaves frame).

---

### 4. Comedy / Animated

**What defines it on tape:** Big, expressive, reaction-driven playing with clear comic timing implied by beat-to-beat shifts. Splits into **broad/animated comedy** (`comedic`, `animated`, `expressive` — rubbery faces, physical takes) and the corpus's signature **deadpan comedy** (see category 5). The animated mode plays reactions large but *lands* them.

**Energy / eyeline / delivery:** Energy is **high** (Geovanni Gill `energy: high`, Kevin Burney T2 `energy: high`, Simon Sorrells SC2TK4 `energy: high`). Eyeline is direct to the off-camera partner with wide-eyed double-takes played to the reader; on the broadest takes physicality costs framing and eyeline (Kevin Burney: `"big physicality occasionally costs him framing and eyeline"`). Delivery is gesture-forward and face-forward — `"rubber-faced expressiveness."`

**Example tapes:**
- **Geovanni Gill_S3** — `["comedic","animated","expressive","warm"]`, `"wide-eyed shocked double-take... instant, broad, and genuinely funny."`
- **SimonSorrells_Coach_SC2TK4** — `["comedic","animated","exasperated","blustery","expressive"]`, the high-energy outlier and `"tonal counterpoint to the dramatic reads."`
- **Kevin Burney_Security Gaurd_T2** — `["intense","confrontational","animated","comedic"]`, scene-stealing character expressiveness.

---

### 5. Deadpan / Dry

**What defines it on tape:** Comedy (or menace) carried by *stillness* and a single punctuating gesture rather than mugging — the corpus's most distinctive register, almost wholly authored by two performers. The defining move is a held, unimpressed neutral that breaks into one sharp button (a finger-jab, a face-rub). The corpus prizes this: deadpan takes repeatedly earn `"restraint is the choice"` and `"lets stillness do the work."`

**Energy / eyeline / delivery:** Energy is **medium**, deliberately contained. Eyeline is steady and near-lens, often using direct address as a coaching/confrontational beat (`"using direct address as a coaching beat"`). Delivery is dry, slow-burn, reaction-driven; the comedy lives in the *delay* before the gesture lands.

**Example tapes:**
- **SimonSorrells_Coach_SC3TK1** — `["deadpan","comedic","exasperated","dry","grounded"]`, `"arms-crossed deadpan skepticism resolving into a sharp accusatory finger-point — clean comedic button."`
- **SC2TK3.mov** (Simon Sorrells, Coach) — `["comedic","deadpan","grounded","exasperated"]`, the `"deadpan face-rub of exhaustion... pure comedic exasperation read entirely through business."`
- **Miska Kajanus_4** (menace variant) — `["sinister","deadpan","intense","darkly comedic"]`, deadpan deployed for unsettling rather than funny.

---

### 6. Warm / Charming (incl. Flirtatious & Procedural-Warm)

**What defines it on tape:** Likeability as the primary color — genuine smiles, easy bashful beats, conversational ease. Subdivides into **commercial-warm** (`warm`, `charming`, `light`, `affable` — built for hospitality/commercial spots), **flirtatious-warm** (`warm`, `flirtatious`, `playful` — relationship two-handers), and **dynamic-warm** (warmth that pivots hard to other colors).

**Energy / eyeline / delivery:** Energy is **medium**, relaxed. Eyeline mixes near-lens direct address with off-lens reader glances — the commercial variant is openly camera-aware (Tim Herkenhoff: `"reads as camera-aware/commercial"` with `"warm to-lens smiles"`), the flirtatious variant holds the reader at `"a tight, believable conversational distance."` Delivery is unhurried, smile used as a recurring physical anchor.

**Example tapes:**
- **TimHerkenhoff_GuestMarriott** — `["warm","comedic","charming","light","affable"]`, `"effortless, beaming hospitality charm... instantly castable as the friendly guest."`
- **AlessandraScotto_Leah_SC1TK1** (flirtatious) — `["warm","flirtatious","vulnerable","grounded","intimate"]`, the `"chin-resting-on-knuckles flirtatious smile."`
- **Esa Stallworth_June_S1** (dynamic-warm) — `["dynamic","warm","confrontational","expressive","grounded"]`, the `"lean-in laugh that immediately hard-cuts to a cold skeptical glare — total tonal command."`
- **Naomi Baker_Tara_S1** — `["charismatic","comedic","vulnerable","warm","dynamic"]`, coy → big laugh → confident grin → wounded vulnerability in one take.

---

### 7. Dark / Tragicomic / Unsettling (the sad-clown register)

**What defines it on tape:** A single high-difficulty register the corpus isolates almost entirely to one performer (Miska Kajanus, across 6+ takes in full clown costume). Defined by playing **against** the visual — pathos and menace beneath whimsical makeup. Tags cluster as `melancholy`, `tragicomic`, `unsettling`, `eerie`, `sinister`, `deadpan`, `dark-comedic`.

**Energy / eyeline / delivery:** Energy is **low-to-medium**, with stillness as the active choice (`"so still it could read as inert... but here the control sells the creep"`). Eyeline is the load-bearing tool: dead-eyed, unblinking near-lens stares used for confrontational direct address, broken only by deliberate eyes-closed beats. Delivery is restrained to the point of deadness — the gap between cheerful costume and funereal performance *is* the performance (`"played completely AGAINST the costume: somber, heavy-lidded, weary"`).

**Example tapes:**
- **Miska Kajanus_2** — `["dark","tragicomic","vulnerable","unsettling","melancholy"]`, `"dead-eyed, downcast neutral stare... heartbreaking and a little frightening."`
- **Miska Kajanus_4** — `["unsettling","deadpan","sinister","dark-comedic","menacing"]`, `"motionless dead-eyed stare against near-black — genuinely unsettling."`
- **Miska Kajanus_8** (character: "Clown") — `["unsettling","tragicomic","deadpan","melancholic","menacing"]`, the closing `"eyes-shut, gloved-hand-to-throat sad-clown beat — genuine tragic pathos."`

---

### How the app should use this taxonomy

These seven registers are not mutually exclusive — the corpus shows the strongest tapes *move between* them inside a single take (David Schrock spans grounded→grief→resolve; Esa Stallworth spans warm→cold; Naomi Baker spans comedic→vulnerable). The coaching vocabulary should therefore treat tone as a **trajectory**, not a fixed label, and the two reliable craft signals across all seven are: (1) **eyeline discipline scales with register** — grounded/warm hold tight off-lens; vulnerable and dark *break* eyeline on purpose; menace and deadpan lock down-lens; and (2) **energy is diagnostic** — `medium` is the grounded baseline, `high` flags confrontational/distraught/animated (and carries the corpus's recurring framing-break risk), `low` flags restrained vulnerability and the sad-clown stillness.

## The Dr Self Tapes House Look (Brand Standard)

Across all 110 tapes in this corpus, Dr Self Tapes (DST) shoots to a single, repeatable production recipe. The slate tapes are the smoking gun: every full-length sizecard reveals the same physical rig — two matched daylight-balanced LED soft panels on stands, flanking the subject at roughly 45 degrees camera-left and camera-right, in front of a mottled muslin drop. The Arlene Conrad, David Schrock, Esa Stallworth, Naomi Baker, Marcus Ray, Krystal Mosley, and Alessandra Scotto slates all independently document this identical two-panel-on-muslin plot. That rig is the brand. What follows is the spec it produces, and the benchmark the app should coach toward.

### Lighting (the signature)

**Key direction & softness.** A single soft frontal key, biased slightly camera-left (occasionally front-center), with soft fill from the opposing panel. This shows up tape after tape in the same words: Aida Rodriguez SC1TK1 ("soft frontal key, slightly camera-left"), Nico Jones S1 ("soft frontal key with a slight camera-left bias"), Simon Sorrells, Esa Stallworth, Alessandra Scotto, Anthony Sayo. The key always wraps; there are no hard sources and no visible hotspots.

**Contrast ratio feel.** Low to moderate contrast is the house default — gentle falloff, soft shadow side, clean catchlights, no harsh shadow edges. The dramatic tapes (David Schrock's Mateo, the Colin McCalla and Miska Kajanus character pieces) deliberately push contrast higher for mood, but they are recognized in the data as *departures* from "the flattest house setups," which proves the baseline is soft and even.

**Color temperature.** Two deliberate temperature families, both tied to the backdrop:
- **Cool/neutral-daylight** on the blue and grey backdrops (Aida Rodriguez, Anthony Sayo, Nico Jones cool-grey tapes, all Simon Sorrells Coach blue takes).
- **Warm/neutral** on the brown, olive, and amber muslins (Alex Luna, David Schrock, Geovanni Gill, Krystal Mosley, Nicolas Wilson, Marcus Ray).

Skin is consistently rendered warm-neutral regardless, so faces read healthy against whichever ground is in use.

**Subject-background separation.** The house solves separation two ways, almost never with a hard rim light:
1. **Color/value contrast** — warm skin against a cool blue/grey ground (Aida Rodriguez SC1TK1: "clean subject-to-background separation from the color contrast... rather than a hard rim"), or a light wardrobe value popping off a darker drop (Simon Sorrells' white polo on royal blue; Geovanni Gill's white tee on olive).
2. **Subtle edge/shoulder light** from the panel spill (Alex Luna 4, David Schrock).

The known weak spot — codified here so the app can flag it — is dark hair against a dark muslin, where separation goes soft (Claire Heyler-Erickson Monologue1 Tk2: lighting_quality 6, "hair edge falls slightly into the dark background"; Alessandra Scotto SC1TK3; Nikki P Love S4).

### Background

A **mottled painted muslin/canvas portrait drop** is the dominant house backdrop, run in four documented colorways on the *same* lighting plot:
- **Cool blue-grey / slate / charcoal** (the most common — Nico Jones, Esa Stallworth, Alessandra Scotto, Naomi Baker, the Claire monologues)
- **Warm brown/sienna/terracotta** (Alex Luna, Alex Luna slate)
- **Olive-green / khaki / gold** (Geovanni Gill, Ashli, Marcus Ray, Krystal Mosley)
- **Warm amber/tan** (Nicolas Wilson Eddie, the warm Krystal Mosley scene)

A second, **solid saturated royal/navy blue seamless** (smooth, non-mottled — a "cyc" or paper) is the other recognized house variant, used heavily for the Simon Sorrells Coach material, Anthony Sayo, Ryan Vincent, Tim Herkenhoff, and Aida Rodriguez's blue scenes. The data repeatedly calls this "HOUSE blue." Both the muslin and the solid blue are in-brand; the only true *off-brand* backgrounds in the corpus are the plain interior grey walls in the Kevin Burney tapes (lighting_quality 6 each — flat, "functional rather than cinematic," weak separation), which read as a non-DST or makeshift setup.

### Framing / shot-size norm

The house default is a **chest-up Medium Close-Up (MCU)**, subject **centered**, with **comfortable, slightly-generous headroom**, eyes landing on the upper third. This is the single most consistent variable in the corpus — the large majority of scene tapes are tagged MCU with "centered," "stable," "locked-off," "no drift." The norm loosens to a **Medium Shot (MS) or Medium-Wide (MWS)** only when the material demands gesture or prop room: the Simon Sorrells Coach takes (crossed arms, finger-jabs), the Miska Kajanus clown costume tapes, the Colin McCalla gun-prop scenes, and Tim Herkenhoff's hospitality spot. Framing *breaks* in the data are almost always performance-driven (a hair-flip turn, a head-in-hands collapse, a lean to a phone prop), not operator error.

Slates follow a fixed two-part structure: **tight CU/MCU ID shot → full-length WS sizecard** that reveals the rig.

### Capture format

Default capture is **1280×720**; the premium tier is **1920×1080**, reserved for the most finished work (all Simon Sorrells Coach takes, the David Schrock Mateo tapes, Anthony Sayo). The data explicitly notes the 1080p tapes look "sharper" and "more finished." Resolution should not be confused with the house *look* — a clean 720p tape with the rig and framing right is fully in-brand.

### Aesthetic in one line

Soft, even, broadcast-clean, flatteringly-lit portraiture — warm-rendered skin floating cleanly off a mottled-muslin or saturated-blue ground, framed as a steady centered chest-up MCU. It reads "professional casting room," not "home webcam."

### Consistency across the corpus (the numbers)

The house look is strikingly uniform. Scoring `lighting_quality` across the 110 entries, the overwhelming mass sits at **7–9**, clustering on **8** — e.g. the in-house benchmark band runs 8s (Aida Rodriguez, Nico Jones, Simon Sorrells blue takes, Geovanni Gill, Esa Stallworth, Naomi Baker, Anthony Sayo, Alex Luna 2/3, Ashli, Marcus Ray) up to the rig's ceiling of **9** (David Schrock Mateo SC2TK1/TK2 — "the most cinematic lighting in the batch," "the best-shot tape in the batch"). Anthony Sayo's `technical_quality` 9 and Simon Sorrells' 9s mark the same top tier.

The lighting only dips to **6** in three named, explainable situations: (1) the off-brand plain-grey-wall Kevin Burney tapes, (2) dark-hair-on-dark-muslin separation losses (Claire Monologue1 Tk2, Alessandra SC1TK3-adjacent grade), and (3) the heavy-makeup clown tapes where white greasepaint blows the highlights (Miska Kajanus). The only sub-6 technical scores in the entire corpus (`technical_quality` **4**, Ryan Vincent take 5) are a corrupt-file delivery defect, *not* a lighting or staging failure. There is no instance of a DST scene tape being badly *lit* — the floor is "soft and even but separation-challenged," never "harsh" or "amateur."

### The benchmark the app coaches toward

An actor's self-tape matches the DST house standard when it hits all of the following:

1. **Lighting:** one soft frontal key biased slightly camera-left + opposing soft fill; low-to-moderate contrast with gentle falloff; clean catchlights; no hard shadows or hotspots. Target `lighting_quality` ≥ 8.
2. **Color temperature:** consistent and motivated by the backdrop — cool/daylight on blue/grey, warm on brown/olive/amber — with warm-neutral skin either way.
3. **Separation:** subject reads cleanly off the ground via color/value contrast or gentle edge light. **Flag the failure mode:** dark hair or dark wardrobe against a dark drop with no rim — coach a hair light, a step forward off the muslin, or a lighter-value drop.
4. **Background:** mottled muslin (cool grey/blue, brown, olive, or amber) **or** saturated royal-blue seamless — smooth, shadow-free, unobtrusive. Coach *away* from plain interior walls (the Kevin Burney failure pattern).
5. **Framing:** centered chest-up MCU, comfortable upper-third eyeline, locked-off; loosen to MS/MWS only when the scene needs gesture or prop room; keep the actor in frame through physical beats.
6. **Format:** 1280×720 minimum, 1920×1080 preferred; stable, non-corrupt export.

Hit all six and the tape is indistinguishable from a Dr Self Tapes house production — which is exactly the bar.

## Product Insights: The AI Self-Tape Analysis Feature

The corpus is 110 per-tape analyses across roughly 25 actors. Nearly every tape was shot on the same two-LED-panel rig against one of three house muslin variants (cool grey/blue, saturated royal blue, warm olive/amber) — documented explicitly in the slate tapes (Arlene Conrad, Naomi Baker, Alessandra Scotto, Krystal Mosley, Marcus Ray, Esa Stallworth, David Schrock). That uniformity is the strategic gift: it gives the app a **known-good "house look" benchmark** to score every tape against, which is the spine of the recommendations below.

### 1. Which dimensions to auto-score, and how

Score five dimensions on a 1–10 scale, mapped directly to fields the corpus already proves are extractable per-frame:

- **Framing & stability (the highest-confidence auto-score).** Compute head-box center, headroom, and frame-to-frame drift. The corpus already separates *technical drift* from *motivated blocking* — the differentiator the app must replicate. Penalize true drift (Kevin Burney T2/T3 "ducks low, drops head toward the bottom edge," ColinMcCalla SC2TK1 "drops almost entirely out of frame, only top of head visible," Nikki P Love S1 "nearly exits the bottom of frame," ColinMcCalla SC3TK1 "first ~15% mis-framed with head out of frame"). Do NOT penalize intentional exits (Nikki's hair-flip button, ColinMcCalla's full back-turn). Implementation: flag a framing break only when the head-box leaves a safe zone AND the actor is not mid-gesture/turn — surface as "you broke frame at 0:42; if that was a choice, widen your shot next take." Headroom scoring is trivially calibratable: the corpus repeatedly names "comfortable headroom" (8s) vs "slightly tight, crops the top of the ponytail" (Alex Luna_7, borderline) vs "generous-but-appropriate."

- **Lighting quality (already a clean 6–9 scale in the data).** Score on three measurable signals the notes consistently cite: (a) **even soft key, low contrast** = house standard (the 8s); (b) **subject-to-background separation** — the recurring failure mode is "dark hair against dark backdrop reduces rim" (Claire's grey-backdrop takes drop to 6–7, Esa S2T2, Naomi); (c) **exposure of the face**. The clearest benchmark anchor is David Schrock's Mateo tapes at 9 ("the most cinematic lighting in the batch," warm Rembrandt modeling, edge separation) versus the flat grey-wall tapes (Kevin Burney at 6, "functional, not stylized"). Auto-score by measuring histogram contrast, face-region exposure, and an edge-separation delta between hair pixels and background pixels — all three are named as the deciding factors in the corpus.

- **Eyeline discipline.** Detect gaze vector and reader position. The corpus's gold standard is "tight to lens, off-camera, consistent, never wanders to the monitor" (Esa Stallworth, David Schrock, Anthony Sayo). The two scoreable faults are (a) **monitor-checking** (explicitly never seen in the good tapes — "never drifting to her own monitor," "no drifting to a reading device") and (b) **wide/inconsistent reader placement** (Nikki P Love S4: "reader placed well off-lens camera-right, more theatrical staging than tight self-tape discipline"). Critically, score eyeline *breaks* as neutral when they coincide with an emotional beat (Alex Luna's upward pleading look, Nikki's turn-aways are all flagged "intentional, not a lapse"). The app should detect a monitor-glance (gaze dropping to a fixed off-axis low point repeatedly, on non-emotional lines) and flag only that.

- **Energy.** The corpus already buckets every tape low/medium/high and it tracks cleanly with genre: comedic coach takes and distress-thriller takes run "high" (SimonSorrells SC2TK4, Alex Luna, Nikki P Love, Ashli), grounded drama runs "medium" (Nico Jones, David Schrock, Anthony Sayo), monologues run "low/medium" (Claire Heyler-Erickson). Derive energy from motion magnitude + facial-action-unit intensity + vocal dynamics. The actionable output is not the raw level but **dynamic range**: the corpus repeatedly flags the failure of *flat* energy — Alex Luna_4 "the pitch sits high the whole take with little dynamic valley," Claire "stays in a narrow emotional band, could use more variation," RyanVincent_2 "stays in one emotional lane." Score energy *variance* across the take, not the mean.

- **Tone-match.** This is the lowest-confidence auto-score and should ship last / as an assist, not a grade. The corpus assigns 3–5 tone tags per tape (e.g., Esa S1: "dynamic, warm, confrontational, expressive, grounded"; Miska's clowns: "deadpan, eerie, menacing, melancholic"). Use it to *describe* the read back to the actor and, when the actor supplies the breakdown ("they want grounded and warm"), compute overlap between detected tags and target tags. Do not auto-fail on tone — the data shows tone is a directing choice, not a defect.

### 2. Auto-take-ranking ("your TK2 beat TK1")

This is the single most demo-able feature and the corpus is purpose-built for it: it contains **explicit multi-take clusters with per-take scores**, so ranking is a solved problem, not an ML moonshot.

Clusters present: **SimonSorrells Coach** (SC1TK1, SC1TK4, SC2TK3, SC2TK4, SC3TK1 — multiple takes, tech quality 7–9), **AidaRodriguez MaryBeth** (SC1TK1, SC1TK2, SC2TK1, SC2TK2, SC4 — all 7–8), **DavidSchrock Mateo** (SC1, SC2TK1, SC2TK2 — 8–9), **Claire Heyler-Erickson** (Monologue1 Tk1/Tk2, Monologue2 Tk1/Tk3 — 6–8), **Nico Jones Chris** (S1, S2, S2T2, S2T3 — 7–8), **ColinMcCalla Gabriel** (SC1TK1/TK2, SC2TK1/TK2, SC3TK1 — 6–8), **Alex Luna** (2,3,4,6,7), **Esa Stallworth June** (S1, S2T1, S2T2).

Ranking method, in priority order:
1. **Group by actor + character + scene** from the filename schema (`Actor_Character_SCxTKy`), which is already parsed into `actor`/`character`/`scene_take`. The app should auto-detect take siblings — this is the magic moment.
2. **Rank within group** on a composite of the five scores above, weighting technical (framing+lighting+eyeline) and performance (commitment + energy-variance) separately so the feedback can be specific.
3. **Generate the comparative sentence from the deltas.** The corpus already writes these comparisons natively: Claire Monologue1 Tk2 (commitment 8) reads as more alive than Tk1 (7, "stays in a narrow emotional band"); DavidSchrock SC2TK2 ("genuine break into tears... technically the best-shot tape in the batch," 9) edges SC2TK1 (also 9 but "uses stillness" — a different color, not a worse one); SimonSorrells SC2TK4 is flagged as "a hotter take than TK3 — more animated... a strong alt-take pushing the scene louder." The output template: *"TK2 beat TK1 — same clean framing and lighting, but you found a dynamic valley you didn't have in TK1 (energy variance +30%) and held the reader without the one monitor-glance TK1 had at 0:51."*
4. **Surface ties as "different colors, pick by intent,"** because the corpus explicitly does this (Mateo's stillness-take vs tears-take; the two "Leah" readings — Alessandra Scotto "flirty-playful" vs Krystal Mosley "warmer/more sensual"). Don't force a single winner when the deltas are tonal, not technical.

### 3. What the house-look benchmark unlocks for coaching

Because ~90% of the corpus shares one rig, the app can ship a **calibrated reference standard** rather than vague advice:

- **A per-tape "house-look gap" report.** The slates literally photograph the rig (Arlene Conrad's WS is described as "a blueprint of the two-panel-on-grey-muslin look"). The app can tell a new user *exactly* where they deviate: contrast too high, key too side-lit, no separation, backdrop too close in value to hair. The corpus proves the most common real gap is **subject/background separation on dark backdrops** — coach toward the warm-muslin variant (Marcus Ray, Krystal Mosley, Nicolas Wilson amber tapes all read richer) or adding rim/distance for dark-haired actors.
- **Backdrop-aware tone guidance.** The data shows the house runs three drops and they carry mood: warm amber muslin = "cozy, nostalgic, intimate" (Nicolas Wilson Eddie), grey/blue = "modern, neutral, grounded" (Nico Jones), royal blue = "clean, commercial, broadcast" (Tim Herkenhoff, Anthony Sayo, RyanVincent_2). The app can recommend a backdrop for the genre the actor is submitting to.
- **A defect detector with teeth.** The benchmark also catches *delivery defects*, not just aesthetics: RyanVincent_5 is flagged twice as a **corrupt file** (technical_quality 4, "H.264 bitstream corrupt past the opening GOP... should be flagged for re-export"). An automated integrity check (decode-to-end, verify duration matches container) is cheap, high-value, and would have caught that before it ever reached casting.

### 4. Highest-value, most demo-able features to build first

Prioritized for impact × demo-ability × feasibility against this exact dataset:

1. **Auto-take-ranking** (build first). Highest wow factor, and the corpus's take-clusters with numeric scores make it directly demonstrable today. "Your TK2 beat TK1" is the headline feature.
2. **Framing & stability score with break-detection.** Most reliable computer-vision signal, lowest false-positive risk, and the corpus gives a clean library of true-drift vs motivated-blocking examples to train/validate the intentionality gate.
3. **House-look lighting gap report.** Differentiated, defensible (no competitor has a calibrated rig benchmark), and the slate tapes are ready-made ground truth.
4. **File-integrity / re-export check.** Cheap, unglamorous, but prevents the RyanVincent_5 failure mode of shipping a broken tape to a CD.
5. **Eyeline/monitor-glance flag.** Builds on face-tracking already needed for framing; one crisp, actionable note.
6. **Tone-match assist** (build last, as description not grade). Highest subjectivity; ship as "here's the read we detected: grounded, confrontational, warm — does that match the brief?"

### 5. Dataset / training value of these 110 tapes

- **A rig-controlled benchmark corpus.** Holding lighting/backdrop/framing nearly constant across 110 tapes isolates *performance and technical-discipline* as the variables — ideal for training scorers that won't overfit to room noise. This is rare and valuable training data precisely *because* it's uniform.
- **Labeled multi-take pairs are the crown jewel.** The Coach, MaryBeth, Mateo, Chris, Gabriel, June, Luna, and Claire clusters give dozens of **same-actor/same-scene take pairs with human scores and written rationales** — exactly the supervision needed to train the take-ranking model and the comparative-sentence generator.
- **Two actors, one role ("Leah": Alessandra Scotto + Krystal Mosley)** is a built-in casting-comparison gold pair — training data for cross-actor, same-material ranking, which is a future "who should we cast" feature.
- **A genre/tone span wide enough to generalize:** grounded drama (Nico Jones, Anthony Sayo), distress/thriller (Alex Luna, Nikki P Love, Ashli), sports comedy (the entire SimonSorrells Coach set), romantic dramedy (the Leah tapes, ColinMcCalla), commercial (Tim Herkenhoff), and a high-difficulty edge case — Miska Kajanus's **eight sad-clown takes under heavy whiteface** — which stress-tests facial-action and emotion detection where makeup defeats naive models. That single actor is the best adversarial validation set in the corpus.
- **Caveats for training honesty:** the set is small (~25 actors), rig-homogeneous (won't represent a user's bedroom setup — the app's *coaching* target is precisely to move users *toward* this look), and the scores are single-rater. Before treating these labels as ground truth, get a second human pass on the multi-take clusters to measure inter-rater agreement on ranking — that agreement number is what tells you how confidently the app can say "TK2 beat TK1."

## Recommended Next Steps

1. **Build auto-take-ranking first.** It is the headline, highest-wow, most demo-able feature, and the corpus's multi-take clusters with per-take scores make it directly demonstrable today. Ship the "your TK2 beat TK1" comparison with a delta-driven explanation sentence (framing, energy-variance, eyeline) — this is the product's signature moment.
2. **Ship the framing & stability score with an intentionality gate.** It is the most reliable computer-vision signal and addresses the corpus's single most common failure (physical commitment outrunning the lock-off). Crucially, flag a break only when the head-box leaves the safe zone AND the actor is not mid-gesture/turn — never punish a motivated exit.
3. **Productize the house-look gap report against the rig benchmark.** The slate tapes are ready-made ground truth; no competitor has a calibrated rig standard. Lead with the most common real gap — dark-hair-on-dark-backdrop separation — and coach the specific fix (warm muslin, step forward, or a hair light).
4. **Add a cheap file-integrity check before any tape reaches a casting director.** Decode-to-end and verify duration matches container. The Ryan Vincent corrupt-file case proves broken exports do happen; this is low-effort, high-value insurance against the worst possible outcome (a CD receiving an unplayable tape).
5. **Score energy as variance, not mean, and surface "play an arc, not a state."** The corpus's clearest performance differentiator is within-take range. Coach actors toward the 3–4-color arc the top tapes deliver, and flag flat single-lane reads as a ceiling regardless of how well the lane is played.
6. **Ship eyeline coaching that rewards proximity and forgives motivated breaks.** Default guidance: reader as close to the lens as possible, hold the line, re-find the partner after any break. Detect and flag only the true monitor-glance — the corpus shows wide reader placement and lost eyeline are real, distinct, and costly faults.
7. **Treat the 110 tapes as a strategic data asset and harden it.** Get a second human rater on the multi-take clusters to measure inter-rater agreement before trusting the labels as ground truth, preserve the Miska Kajanus whiteface set as an adversarial validation suite, and bank the two-actors-one-role "Leah" pair as the seed for a future cross-actor casting-comparison feature.
