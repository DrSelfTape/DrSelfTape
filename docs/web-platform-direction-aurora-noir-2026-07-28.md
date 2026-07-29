# AURORA NOIR
## The web design language of Dr. Self Tape

**One line:** the same aurora gold the app wears in daylight, moved into a dark grading suite. The phone is where you tape. The web is where you work the tape. Aurora Noir is the brand after the house lights go down: obsidian stage, warm charcoal instruments, cream type, and exactly one gold light source per screen.

This is one direction, committed. Everything below is the spec.

---

## 0. The anchor reference (Joseph's pick, 2026-07-28)

Joseph pointed at Leonardo AI's web console as the feel target before this doc existed. The direction below arrived at the same architecture independently; treat Leonardo as the confirmed north star for the CONSOLE surfaces, with one deliberate divergence: their violet accent stays theirs, our gold stays ours (screening room, not render farm).

The five transferable Leonardo moves, with evidence:
1. The media is the interface: near-black canvas, thin chrome, output owns ~80% of the screen. Ours is stronger material: real actors performing. (https://mobbin.com/screens/19ed876e-4a85-4c4e-a448-450f807b7790)
2. Floating card panels, not flat sidebars: the control rail is a rounded instrument hovering over the canvas with labeled stacks and mode chips. (https://mobbin.com/screens/0c4b147b-e3a4-492b-b367-3610fe6cc60e)
3. The prompt bar is the hero, with the credit cost inline on the CTA ("Generate · 80"). Ours: the submit-a-take bar with the review cost on the button. (https://mobbin.com/screens/11d095a1-1545-4002-9d49-702e80c71174)
4. Timeline-grouped library ("Yesterday" / "Today") with metadata chips per item. Ours: takes wearing grade-band chips (Callback Range / Casting-ready), the staged-reveal language as library metadata. (https://mobbin.com/screens/5d6b42a3-43d2-4e33-a577-978526038c7d)
5. Quiet luxury details: credit counter as a small chip, tiny mono labels, "New" badges on tab pills, one accent color. (https://mobbin.com/screens/3870b916-870d-47c6-a40d-9a38878d0e6d)

## 1. Principles

1. **The footage is the decoration.** The darkest surface on screen is the canvas; the only saturated color is the actor's own video. Riverside proves a near-black home where user thumbnails carry all the color reads as confidence, not emptiness (https://mobbin.com/screens/6b8d37c6-06f4-4dc5-91ef-0012ed598168). Every depth effect must be anchored to real content: footage, the stage, or the one light source. If it is not anchored, it gets cut.

2. **One light law.** One warm gold light beam per screen, upper region, roughly 5% opacity. Gold gradient is permitted in exactly two places: the primary CTA and the Premium upsell card. Everything else is matte charcoal with shadow-based elevation. Better Stack shows why scarcity is what makes glow read premium (https://mobbin.com/screens/d541a6a3-b04c-4d58-9485-c4001825e66d); Suno confines its only warm gradient to the Pro card (https://mobbin.com/screens/0dfa0f63-e583-4cec-be93-36a549ebcaed).

3. **Hairlines, not glows.** Structure comes from 1px hairline borders and fixed metadata slots, the Vercel console grammar (https://mobbin.com/screens/5bb75d66-7572-4f2e-a229-ebc54627343b). Meaning is carried by tiny status dots and one accent at a time.

4. **Instruments float, the stage is full-bleed.** In working views, content owns 100% of the viewport and tools hover above it as rounded panels with visible 12 to 16px margins, the Spline architecture (https://mobbin.com/screens/588e02c1-2cf0-4269-8e1d-ab4636a5c76b). Glass only where there is footage behind it to justify the blur, the Artlist rule (https://mobbin.com/screens/356c69ba-162b-4cb8-97f7-37bcd5dc3726).

5. **Keyboard culture is the desktop tell.** A visible shortcut hint in the search field, a command palette, an Esc-labeled help panel. The phone physically cannot have this, so shortcuts ARE the step-above signal (Google AI Studio's slash-command homepage: https://mobbin.com/screens/d3212a1c-a0f1-49fb-835c-737c0117c3bd; Linear's Esc-hinted help slide-over: https://mobbin.com/screens/cd1c0b3f-1587-4a66-afed-fdbd4fa9deed).

---

## 2. Tokens

Implemented as a `[data-surface="console"]` block in `src/App.css`, stamped by `src/utils/theme.jsx` on desktop web only. Native keeps `data-theme="light"` untouched.

### Palette
| Token | Value | Role |
|---|---|---|
| `--noir-stage` | `#0B0A08` | page background, warm near-black |
| `--noir-panel` | `#141210` | cards, sidebar, floating instruments |
| `--noir-panel-raised` | `#1B1815` | hover states, popovers |
| `--noir-glass` | `rgba(20,18,16,0.72)` + `backdrop-filter: blur(20px)` | panels over footage only |
| `--noir-hairline` | `rgba(245,237,220,0.08)` | all borders |
| `--noir-text` | `#F5EDDC` | primary text (cream, carried from aurora) |
| `--noir-text-dim` | `#A69C89` | secondary text, metadata |
| `--noir-gold` | `#D4A85F` | the accent (existing `--aurora-accent`, unchanged) |
| `--noir-gold-hot` | `#FCE072` | CTA gradient endpoint, status pulse only |
| `--noir-coral` | `#FF8280` | destructive and alerts only, never decoration |

Status dot grammar (tape lifecycle, Vercel-style): gold pulsing = analyzing, green `#4ADE80` = reviewed, gray = draft, blue `#7DB8F5` = shared with CD.

### Type
One serif, standardized: **Instrument Serif** for display (it is what login already ships; Playfair gets dropped from the web head). **Space Grotesk** for UI. **JetBrains Mono** for eyebrows, timestamps, scores, slate labels. One consolidated preload in `index.html`, the three parallel font pipelines die.

Desktop type scale (new tokens, the existing `--type-*` steps are phone-sized):
`--console-type-body: 14px/1.55` · `--console-type-label: 12px mono, tracked +8%` · `--console-type-h3: 20px` · `--console-type-h1: 32px` · `--console-type-display: 56px Instrument Serif`.

### Depth and glass rules
- Elevation ladder: stage (0) → matte panel + shadow (1) → floating instrument, 12 to 16px margin (2) → glass over footage (3) → dimmed-console overlay moment (4).
- Glass is forbidden on the stage background. It exists only at level 3, over video.
- Shadows: `0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.35)`. No colored shadows.
- One embossed logo chip in the sidebar header, the single permitted soft under-glow (Better Stack's move).

### Motion signature (Kowalski discipline)
- **Properties:** `transform` and `opacity` only. Never width, height, top, left, filter, or box-shadow animation.
- **Durations:** hover and press 120ms; enter 200ms; exit 140ms; the one ceremonial exception, the Tape Review reveal card, 260ms. Nothing exceeds 300ms.
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (strong ease-out) for enters; `ease-in` 140ms for exits. No bounce, no spring overshoot on data surfaces.
- **Enters:** `opacity 0→1` + `translateY(6px)→0`, or `scale(0.98)→1` for popovers, transform-origin at the trigger.
- **The only loop:** the gold "analyzing" status dot, an opacity pulse at 2s. No other infinite animation anywhere.
- **`prefers-reduced-motion: reduce`:** every transform animation drops to a 120ms opacity fade; the status pulse becomes static; the login background video does not autoplay.
- Existing `(hover:hover)` gating in App.css stays the mechanism: richer interaction by capability, not by fork.

---

## 3. How it stays Dr. Self Tape

Same gold `#D4A85F`, same cream, same Instrument Serif and JetBrains Mono pairing the login already wears, same aurora token names underneath (the console block overrides `--aurora-*` values, components do not change). The Sana hero proves the warm cream and gold palette reads high-end on the open web (https://mobbin.com/sites/sections/db51ca4b-6b19-4bcb-bfc0-60a414df6e59). Aurora Noir is not a second brand; it is the same brand at a different time of day: iOS is the actor in daylight, web is the studio at night. The gold means the same thing on both: the thing to do next.

---

## 4. Logged-out: the backstage door

Today a casting director on a 27-inch display gets a phone column floating in video. That dies. The desktop branch inside `LoginPage.jsx` becomes a cinematic split, the Epidemic Sound and Leonardo structure (https://mobbin.com/screens/b11e2914-efc1-45e7-8bad-e5f6be0d3776, https://mobbin.com/screens/e3b933a0-aae2-42ec-8568-3d2ae61733a4):

- **Left third, the form rail:** `--noir-panel`, embossed logo chip, JetBrains Mono eyebrow "FOR ACTORS WHO BOOK", Instrument Serif "Sign in to the studio.", Apple and Google SSO first, then email. One gold-gradient CTA, the only gradient on the page. The form is deliberately boring; the image does the talking.
- **Right two-thirds, the plate:** full-bleed, warm-graded cinematic still or slow footage of an actor mid-take, ring-light catchlights, each plate credited in the corner in mono like a slate: "INT. AUDITION ROOM, DAY · TAKE 3". Plates rotate like lobby posters. Reuses `login-bg.mp4` on day one; upgraded plates follow.
- Beneath the form, three lines of real proof only: App Store rating, "built by working actors", studio credit. No invented numbers, ever (Amplemarket's numbers-plus-faces bento is the model for any future proof band, real stats only: https://mobbin.com/sites/sections/0535e223-36b6-4119-9642-0c6c598bb8be).
- The one restrained futurism flourish: a single warm light beam raking from the upper corner at ~5% opacity, the Square-style lighting-does-the-futurism move (https://mobbin.com/sites/sections/4d088f68-033d-4090-8176-e40bfadfb673).
- When a marketing band or pricing page comes later: real console screenshot below the fold as the demo, the Twenty pattern (https://mobbin.com/sites/sections/abe261e4-d901-42f1-bea3-0a806e2d0669), and free-tier-first pricing framing per Clerk (https://mobbin.com/sites/sections/5125964c-8b12-49cc-b037-8e052fc553f9) with Leonardo-style spec rows for AI allowances (https://mobbin.com/sites/sections/d8309ba1-6670-4457-bf39-945aa509a2be).

Mobile and native keep the existing JSX untouched, same branch pattern DashboardLayout already uses.

---

## 5. Logged-in: the studio console

The desktop branch of `DashboardLayout.jsx`, `Sidebar.jsx`, and `Home/` are provably desktop-only. They get rebuilt wholesale.

- **Home answers "what are we taping today?" before showing the archive** (Riverside): a row of five verb tiles, Record a Tape / AI Reader / Tape Review / Compare Takes / Your Own Sides, each icon + one-line description on `--noir-panel`. Below, the tape library: uniform 16:9 thumbnails with duration badges, role and project in fixed slots, status dot, relative timestamps, "My 12 Tapes" count, sort by "Last taped", ONE gold "New Tape" button (Runway projects grid: https://mobbin.com/screens/a915c29f-a1af-419e-a26e-7123585940d1). Empty and processing tiles get a DST clapperboard watermark so a new user's grid looks designed, never hollow.
- **The hero is the actor's own latest frame:** a graded full-bleed still from their most recent take with a charcoal-glass "Continue session" card floating over it, scene name, take count, last review grade, one gold pill (Artlist: https://mobbin.com/screens/356c69ba-162b-4cb8-97f7-37bcd5dc3726). Empty state uses a house-look plate.
- **Sidebar:** minimal groups under uppercase mono micro-labels (Runway: https://mobbin.com/screens/d1f1a908-5b8a-492a-8398-d233b9109b3f): TAPE, AI TOOLS, CONNECT. "Find a tape…" input at the top with a visible ⌘K hint. Utilities pinned to the bottom rail with the gold "Open Studio" pill.
- **⌘K command palette** with slash verbs: /record, /review, /compare, /reader, /sides, /shortcuts. Also surfaced inline on Home so mouse users discover it.
- **List view** of tapes grouped by status (Needs Review / Reviewed / Sent to Reader / Shared) with counts; multi-select summons a floating bottom bar with "Compare Takes" and "Share", turning Compare into a natural bulk action (Linear: https://mobbin.com/screens/1de7cb91-a9b7-49b7-add3-057f0e4ea896).
- **"?" help slide-over** (Esc-hinted): Self-Tape Guide, Keyboard Shortcuts, What's New (reuses `whatsNew.js`), Report a Problem (existing AdminSupportMessage inbox). Four existing features consolidated into one pro affordance, and an activation surface pointing at the first Tape Review.
- **Working views** (record, tape detail) adopt the Spline architecture: full-bleed viewport, floating collapsible instruments (script/sides, take bin, reader controls) with 12 to 16px margins (https://mobbin.com/screens/7f393ffd-357b-4228-b0ab-3d56af183a0c).
- The usage meter for AI allowance lives quietly on the dashboard, Vercel-style, a meter not a nag.

---

## 6. Data display: reports, DNA, comparison

Desktop-class data is the moat a phone cannot match. Three surfaces:

**Tape Review = a dated report you keep, laid out as an entity page.** Document ceremony per Sprig (https://mobbin.com/screens/9959c94b-fcd0-484b-9547-070c13133d31): title "Tape Review · [Project]", generated-on stamp, Re-run and Share actions, evidence chips (3 takes analyzed, 14 timestamped notes, 6 axes scored) that link into detail. The body is a two-pane reading view per Sana AI (https://mobbin.com/screens/93e8608f-ca4f-402e-bf3b-9c6f97393667): Jericho's structured notes in the main column with a "Next take" section, right rail pinning the player, the sides, and timestamped moments that jump the playhead, plus a follow-up chip feeding the Slate copilot. Above the document, a Fey-style module grid, one tape as one entity (https://mobbin.com/screens/43d6fe8a-60c8-4a37-abea-f73ee9c78842): score vs your-average bar, casting-readiness dot on a track, small DNA radar, take-score timeline. Hairlines, one accent per module, no glow on any chart.

**Performance DNA = a literal hexagon with numbers at the vertices** (Uxcel: https://mobbin.com/screens/21d4ea38-429b-48b6-8cd0-31e8c0126dd2), gold polygon on gray grid (15Five proves the palette: https://mobbin.com/screens/1d575d26-986d-4126-9c12-2dd26aa3d0b3). Overlay toggle: this tape vs your 30-day average vs the house-look ideal from the research study. Table view toggle for actors who want the numbers. This is the identity artifact people screenshot; it is built share-shaped.

**Compare Takes = takes as columns.** Each take is a column headed by its thumbnail (hover to scrub), rubric criteria as sticky rows so differences read across, tabs for Scores / Notes / Technicals, winner column tinted (Zillow matrix: https://mobbin.com/screens/91442f69-4d80-4ae6-a192-bb2f73bf6776; winner tint per Going: https://mobbin.com/screens/476b9f04-bc8a-4da3-808c-5ebfce04a4ee). Mobile stacks; this is the visibly desktop-class upgrade a CD sees from a shared link.

**The reveal ritual:** Tape Review results and a weekly recap arrive as a portrait 9:16 story card over the dimmed console (Origin: https://mobbin.com/screens/771611e5-8d7f-46ab-9727-19ace3bc34f4), grade, one pull-quote note, take thumbnails, paged with dots. The card IS the Remotion report-card share asset; the depth pattern and the growth loop are one component. My Growth later inherits the Mixpanel variable-card board with a Jericho prose card inside the grid (https://mobbin.com/screens/1a7d8d86-f0e8-456a-a60c-65c6eb13a252) and LangSmith tab families for history depth (https://mobbin.com/screens/b7b317f3-20b0-4cf6-86af-c10ae16d0681).

Shared-panel constraint respected: these panels render inside the iOS app, so v1 reaches them through the console token layer only; structural desktop layouts are additive and `useIsMobile()`-gated, mobile JSX untouched.

---

## 7. Do not do

The failure mode has a name: 2021 crypto-AI template. Reflect's glowing purple orb login and Lovable's "Nexus" neon-chart dashboard are the reference anti-patterns (https://mobbin.com/screens/8923e2d0-60b7-47a2-9f4e-cb048fca8ef5, https://mobbin.com/screens/ad361de1-19e5-4115-b654-876e0d8c06a8). Hard bans, written into the spec:

1. **No gradients on controls** other than the single primary CTA and the Premium card. Secondary buttons, auth buttons, chips: matte.
2. **No glow on charts, icons, or logos.** Glow is ambient light only, one source per screen. Exception: the embossed sidebar logo chip.
3. **No accent-on-accent.** Never gold glow on gold surfaces, never warm-on-warm stacking where nothing recedes.
4. **No unanchored depth.** No floating 3D blobs, circuit grids, particle fields, or parallax for its own sake. If a 3D flourish ever ships it is tone-on-tone in brand materials, obsidian, brass, charcoal, per Resend's silver-on-black recipe (https://mobbin.com/screens/6475b59c-5c06-48d0-8005-44b0620347c7). Colored glow on ambient 3D is banned outright.
5. **No fake stats, badges, or invented social proof.** Every number on a marketing surface is real or absent. No fake gamification owning the fold (already flagged in the layout gameplan).
6. **No cool-blue or purple "tech" palette.** The dead dark-theme block gets re-audited and retokened warm before any reuse; the `#A040C8` purple remnant and `#ff6b35` spinners die in Ring 0.
7. **No motion excess.** No infinite loops beyond the status pulse, no bounce on data, no animation over 300ms, no animating layout properties, no scroll-hijacking.
8. **No second shell.** A user must never fall from the console into the MUI-era Shared/Layout. Legacy chrome is absorbed or killed, not left as a trapdoor.
9. **No glass on the stage.** Translucency without footage behind it is decoration, and decoration gets cut.

---

## Build ring plan

### Ring 0 [S]: Noir foundation: console theme hook + CSS debt kill
Stamp data-surface="console" from theme.jsx on desktop web only (native untouched, keeps data-theme=light). Add the [data-surface="console"] token block to App.css overriding --aurora-* with the Aurora Noir palette, desktop type-scale tokens, motion tokens, and reduced-motion rules. Pay the debt on the exact first-impression surfaces: rewrite the #1E1E1E autofill override to token colors, retoken/delete .card-section, .topbar-style, notification-pulse hardcodes, purge the #A040C8 purple remnant, fix both #ff6b35 Suspense spinners, consolidate the three font pipelines into one preloaded set (Instrument Serif + Space Grotesk + JetBrains Mono).

**Files:** src/utils/theme.jsx, src/App.css, index.html, src/routes/index.jsx (line 41 spinner), src/panels/Dashboard/DashboardLayout.jsx (line 28 spinner), src/panels/Auth/LoginPage.jsx (remove injected font link)

### Ring 1 [M]: The backstage door: desktop logged-out split
Desktop branch inside LoginPage (same if-statement pattern DashboardLayout uses): new ConsoleLanding component with the left form rail (SSO-first, embossed logo chip, one gold-gradient CTA, real-proof lines) and right two-thirds cinematic plate with slate-style corner credit, single 5%-opacity light beam, reduced-motion-safe video handling. Mobile/native path is the existing JSX, byte-identical. Reuses login-bg.mp4 day one; plate rotation hook ready for upgraded stills later. Signup desktop branch mirrors it.

**Files:** src/panels/Auth/LoginPage.jsx (branch only), new src/panels/Auth/ConsoleLanding.jsx, src/panels/Authentication/SignUp (branch), public/login-bg.mp4 (reused)

### Ring 2 [L]: The studio console shell: sidebar, home, command palette
Wholesale rebuild of the provably desktop-only surfaces: Sidebar.jsx (mono micro-label groups TAPE / AI TOOLS / CONNECT, Find-a-tape input with visible ⌘K hint, bottom utility rail with gold Open Studio pill), DashboardLayout desktop branch (noir stage background, one light beam, floating-chrome architecture), Home/index.jsx + HomeAnalytics.jsx (verb tiles row, latest-take hero with glass Continue-session card, 16:9 tape grid with status dots + clapperboard watermark empty state, quiet usage meter). New CommandPalette (⌘K, slash verbs /record /review /compare /reader /sides /shortcuts) and the ? help slide-over (Guide, Shortcuts, whatsNew.js, Report a Problem). All motion per the signature: transform/opacity, sub-300ms, strong ease-out.

**Files:** src/components/Sidebar.jsx, src/panels/Dashboard/DashboardLayout.jsx (desktop branch only, never the isMobile return), src/panels/Dashboard/Home/index.jsx, src/panels/Dashboard/Home/HomeAnalytics.jsx, new src/components/CommandPalette.jsx, new src/components/HelpSlideOver.jsx, src/data/whatsNew.js (read only)

### Ring 3 [L]: Desktop-class data: report page, DNA hexagon, Compare matrix
SHARED-panel territory, so every structural change is additive and useIsMobile()-gated; mobile JSX paths untouched, token restyling already delivered by Ring 0. Tape Review desktop layout: document ceremony header (title, generated-on stamp, Re-run/Share, evidence chips), Fey-style module grid, Sana-style two-pane reading view with pinned player + timestamped moment jumps + follow-up chip into Slate copilot. Performance DNA hexagon with vertex numbers and overlay toggles (this tape / 30-day avg / house-look ideal) + table toggle. Compare Takes columns with sticky criteria rows, hover-scrub thumbnails, tinted winner column. Tape list view grouped by status with multi-select floating action bar (Compare / Share).

**Files:** src/panels/Dashboard/Jericho/TapeReview/* (gated desktop layout), src/panels/Dashboard/CraftJourney/* or DNA component (gated), Compare Takes components under Jericho/SelfTapes (gated), src/panels/Dashboard/SelfTapes (gated list view), src/hooks/useIsMobile.js (reused, unchanged)

### Ring 4 [M]: Coherence sweep + the reveal ritual
Kill the trapdoor: move /settings and /notifications under the DashboardLayout tree (or restyle Shared/Layout to console chrome as fallback), retire sideMenuConfig double-maintenance, retire superseded legacy tracker/scene-study routes where the /dashboard equivalents exist. Ship the dim-and-focus story-card overlay: Tape Review reveal + weekly Your Week in Tapes recap as a 9:16 portrait card over the dimmed console, paged with dots, 260ms ceremonial enter, reduced-motion fallback, component shared with the Remotion report-card asset.

**Files:** src/routes/config.jsx (route moves), src/components/Shared/Layout/index.jsx + Shared/SideMenu (absorb or delete), src/routes/sideMenuConfig.jsx (delete), new src/components/RecapStoryCard.jsx, App.css (border-style class cleanup)

## Open taste questions (Joseph)

1. How far do we split day and night: the web console goes full obsidian while iOS stays cream and gold daylight. Are you comfortable with the two surfaces being that visibly different, or do you want a lighter noir (dark charcoal, more cream) that sits closer to the phone app?
2. The login page's right two-thirds is a rotating cinematic plate of an actor mid-take. What passes your slop bar: real footage we shoot with studio clients, Higgsfield house-look generated plates credited like slates, or the existing login-bg.mp4 regraded until real footage exists?
3. One serif everywhere on web: Instrument Serif (what login already wears, sharper and more editorial) or Playfair Display (the original brand serif the iOS app uses)? Whichever wins gets standardized and the other is dropped from the web head.
4. Flourish budget for logged-out: is one tone-on-tone sculptural element (a brass slate or curl of dark film in the login corner, gold only where light catches it) worth building, or do we stay pure photography, type, and the single light beam with zero 3D?
