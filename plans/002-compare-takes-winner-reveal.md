# 002 — Stage the Compare Takes winner reveal

- **Status**: TODO
- **Commit**: c428264 (plus plan 001's uncommitted tr-reveal changes, which this plan REQUIRES)
- **Severity**: HIGH (second of the two rare verdict moments; currently renders flat)
- **Category**: Missed opportunities / purpose & frequency
- **Estimated scope**: 1 file (`src/panels/Dashboard/Jericho/CompareTakes.jsx`), ~8 line edits

## Problem

Compare Takes already fires a success haptic the moment the ranked result lands
(`CompareTakes.jsx:80`), but the visual verdict — winner banner, medal-ranked
take cards, unlock card, action buttons — renders in one instant swap. The
haptic says "something happened"; the screen doesn't.

`src/panels/Dashboard/Jericho/CompareTakes.jsx:196-199` — current:

```jsx
    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Winner banner */}
        <div className="rounded-2xl border border-[#D4A85F]/35 p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(212,168,95,0.16), rgba(122,90,24,0.05))' }}>
```

## Target

Reuse the `.tr-reveal` system added by plan 001 (`src/App.css`: 380ms entrance
from `opacity: 0; translateY(8px) scale(0.98)` on `cubic-bezier(.2,.7,.3,1)`,
60ms stagger via `--tr-i`, reduced-motion guard included). NO new CSS — this
plan is JSX-only. The winner banner lands first (in sync with the existing
haptic), ranked cards follow in medal order, tail cards last.

## Repo conventions to follow

- The `tr-reveal` class + `--tr-i` pattern from plan 001. Exemplar (already in
  the tree, TapeReview.jsx verdict card):

  ```jsx
  <div className="rounded-2xl border border-[#D4A85F]/25 p-4 sm:p-5 tr-reveal" style={{ '--tr-i': 0, background: '…' }}>
  ```
- If `.tr-reveal` does not exist in `src/App.css`, plan 001 has not been
  executed — STOP and report.

## Steps

All edits in `src/panels/Dashboard/Jericho/CompareTakes.jsx`, inside the
`if (compareResult)` result render (`:166-`). Locate by the JSX comments cited
below; line numbers are as of the plan date.

1. **Winner banner** (`:199`, comment `{/* Winner banner */}`): append
   ` tr-reveal` to the className; merge `'--tr-i': 0` into the existing style
   object.

2. **Ranked take cards** (`:220-227`, the `order.map((n, idx) =>` card): append
   ` tr-reveal` to the className; merge `'--tr-i': idx + 1` into the existing
   style object (it already spreads `...SURFACE` — put `'--tr-i': idx + 1`
   first so it can never be clobbered).

3. **Tail cards** — the three top-level siblings after the ranked list, all
   found between `:295-335`:
   - the unlock button (comment `One prominent unlock for the deep per-take notes`)
   - the "What to do" card (comment `{/* What to do */}`)
   - the reset/"compare again" button (`onClick={reset}`)

   Each gets ` tr-reveal` + `'--tr-i': order.length + 1` (create a style object
   where absent, merge where present). They share one index — they're the
   epilogue, not ranked content, and `order.length` is in scope throughout the
   result render.

## Boundaries

- JSX only. Do NOT add or modify CSS — `.tr-reveal` comes from plan 001.
- Do NOT touch the incomplete-result error card (`:179-194`) — errors get no
  ceremony.
- Do NOT animate the expandable per-take notes (`:271`, `open &&` block) or the
  chevron — the accordion snap is a separate, unplanned finding; out of scope.
- Do NOT touch `ScoreBar100`, the haptic call, or the duplicate-take (`isDup`)
  logic. The dup case renders the same structure and simply inherits the
  cascade — correct, no special-casing.
- If the structure doesn't match (comments missing, map signature changed),
  STOP and report.

## Verification

- **Mechanical**: `cd ~/Downloads/Projects/DrSelfTape-development && yarn build`
  completes clean.
- **Feel check**: run a comparison (2-4 takes) and confirm:
  - The winner banner lands first, roughly with the haptic; medal cards follow
    top-down; the unlock/actions arrive last as one quiet group.
  - With 4 takes the full cascade ends by ~700ms (index 5 × 60ms + 380ms).
  - DevTools Animations panel at 10% speed: transform/opacity only, every card
    starts from `scale(0.98)`, no blank flash.
  - Emulate `prefers-reduced-motion: reduce`: everything appears instantly.
  - Duplicate-takes case ("Same take" banner): cascade still plays, no winner
    special-casing broke.
- **Done when**: feel checks pass in the simulator or on device.
