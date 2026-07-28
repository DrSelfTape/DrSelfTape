# 001 — Stage the Tape Review result reveal

- **Status**: DONE (2026-07-28, executor + review pass; FirstReviewPaywall added to cascade at review)
- **Commit**: c428264
- **Severity**: HIGH (missed opportunity on the product's core emotional beat)
- **Category**: Missed opportunities / purpose & frequency
- **Estimated scope**: 2 files (`src/App.css`, `src/panels/Dashboard/Jericho/TapeReview.jsx`), ~20 lines total

## Problem

The Tape Review result is the app's aha moment — the user waits minutes through
upload + staged analysis progress, then the ENTIRE casting read (verdict, what's
working, performance read, adjustments, the one thing, mission, scores) swaps in
as one instant render. The product's most important reveal has zero ceremony,
while lesser moments (profile completion, scene badges) get confetti.

`src/panels/Dashboard/Jericho/TapeReview.jsx:611` — current: the result
container renders all sections at once with no entrance:

```jsx
    return (
      <div className="space-y-4 sm:space-y-5">
        {showTutorial && <TapeAnalyzerTutorial onClose={() => setShowTutorial(false)} />}
        <NotificationsNudge />
        {/* Verdict */}
        {r.verdict && (
          <div className="rounded-2xl border border-[#D4A85F]/25 p-4 sm:p-5" style={{ background: 'linear-gradient(135deg, rgba(212,168,95,0.10), rgba(122,90,24,0.04))' }}>
```

## Target

Each top-level result card enters in sequence: opacity 0 + `translateY(8px)
scale(0.98)` → settled, 380ms on the app's own curve
`cubic-bezier(.2,.7,.3,1)`, with a 60ms stagger between cards (verdict first,
scores last). Reduced motion: no movement (follow the app's existing
`animation: none !important` pattern).

New CSS (added to `src/App.css`, directly below the `.aurora-page-in` block
that ends around line 692):

```css
/* Tape Review result reveal — staged card entrance. Index set inline via --tr-i. */
@keyframes tr-reveal {
  0%   { opacity: 0; transform: translateY(8px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.tr-reveal {
  animation: tr-reveal 380ms cubic-bezier(.2,.7,.3,1) both;
  animation-delay: calc(var(--tr-i, 0) * 60ms);
}
@media (prefers-reduced-motion: reduce) {
  .tr-reveal {
    animation: none !important;
  }
}
```

## Repo conventions to follow

- Keyframes + class + reduced-motion override live together in `src/App.css`.
  Exemplar to imitate: `.aurora-page-in` at `src/App.css:682-693` (same curve,
  same `animation: none !important` guard).
- The app's standard entrance curve is `cubic-bezier(.2,.7,.3,1)` (used by
  `aurora-page-in` and `V1HeroGraph`'s `v1hg-num-in`). Do NOT introduce a new
  curve.
- Animate `transform` and `opacity` only.

## Steps

1. **`src/App.css`** — add the `tr-reveal` block from Target verbatim, directly
   after the `.aurora-page-in` reduced-motion block (after line ~693).

2. **`src/panels/Dashboard/Jericho/TapeReview.jsx`** — in the result `return`
   (the `<div className="space-y-4 sm:space-y-5">` block starting at line 611),
   add `tr-reveal` + an incrementing `--tr-i` to each top-level CARD in visual
   order. Concretely, for each of these section wrappers, append
   ` tr-reveal` to its outermost `className` and merge `'--tr-i': N` into its
   existing `style` object (create one where absent):

   | N | Section (current line) |
   | --- | --- |
   | 0 | Verdict card (`:623`) |
   | 1 | What's working card (`:645`) |
   | 2 | Performance read card (`:665`) |
   | 3 | Adjustments card (`:682`) |
   | 4 | The one thing card (`:703`) |
   | 5 | Next Take Mission button (`:721`) |
   | 6 | Scores grid wrapper (`:738`) |
   | 7 | FullReadLocked / Share block and any action buttons after it |

   Example for the verdict card:

   ```jsx
   <div className="rounded-2xl border border-[#D4A85F]/25 p-4 sm:p-5 tr-reveal"
        style={{ '--tr-i': 0, background: 'linear-gradient(135deg, rgba(212,168,95,0.10), rgba(122,90,24,0.04))' }}>
   ```

   Sections render conditionally, so indices may have gaps at runtime — that is
   fine (a missing card just shortens the cascade). Do NOT renumber
   dynamically.

3. Do NOT touch `TapeAnalyzerTutorial` or `NotificationsNudge` (`:616-619`) —
   the tutorial is an overlay and the nudge is a system prompt; neither is part
   of the reveal.

4. Do NOT modify `ScoreBar` (`:181-187`). Its 700ms width fill already
   animates; because its parent card now enters at delay 6×60ms, the fill reads
   as the finale on its own.

## Boundaries

- Motion only: no markup restructuring, no new components, no new dependencies.
- Do NOT add entrance animation to the incomplete-result error card (`:571-585`)
  — an error should not be ceremonious.
- Do NOT touch the loading/progress card (`:518-538`).
- The animation may replay if the user navigates away and back to a result;
  this is accepted (rare surface). Do not add first-render-only logic.
- If line numbers have drifted from commit c428264, match on the JSX comments
  (`{/* Verdict */}`, `{/* What's working */}`, etc.) and STOP if the structure
  itself has changed.

## Verification

- **Mechanical**: `cd ~/Downloads/Projects/DrSelfTape-development && yarn build`
  completes clean (no new warnings referencing TapeReview or App.css).
- **Feel check**: run `yarn dev`, submit a tape (or re-open a stored result to
  see the replay), and confirm:
  - The verdict card lands first; cards cascade downward; nothing pops in late
    out of order.
  - Total cascade stays under ~800ms — it should feel like the read *arriving*,
    not a slideshow.
  - In DevTools → Animations panel at 10% speed: every card moves only
    `transform`/`opacity`, starts from `scale(0.98)` (never a blank flash), and
    delays step by 60ms.
  - DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: cards
    appear instantly, no movement.
  - On the free tier: the trimmed result (verdict + 1 working + 1 adjustment +
    FullReadLocked) still cascades cleanly with its runtime index gaps.
- **Done when**: all feel checks pass on a real iPhone (Capacitor build or
  Safari device preview) — gesture-free surface, so simulator is acceptable if
  no device is at hand.
