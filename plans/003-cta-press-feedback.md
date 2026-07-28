# 003 — Press feedback on gradient CTAs

- **Status**: DONE (2026-07-28, executor + review; cascade-layer check confirms .dst-press wins over transition-all)
- **Commit**: c428264 (working tree also carries plans 001/002, unrelated files)
- **Severity**: MEDIUM (feedback gap on every paying-intent tap; touch app with hover-only affordances)
- **Category**: Physicality / feedback
- **Estimated scope**: 10 files, ~16 one-line edits + one small CSS block

## Problem

The app's primary CTA pattern — gradient gold buttons styled with
`transition-all hover:shadow-lg` — has NO `:active` state. On iOS (the primary
platform) hover doesn't exist, so these buttons give zero visual response to a
press. Every upgrade, analyze, and try-again tap feels dead.

Exemplar of the pattern, `src/panels/Dashboard/Jericho/TapeReview.jsx:48`:

```jsx
className="w-full mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-[#0A0A0A] transition-all hover:shadow-lg"
```

All 15 occurrences (grep `hover:shadow-lg` in `src/**/*.jsx` to re-derive if
drifted):

- `src/panels/UserPanel/Actor/AuditionTracker/index.jsx:443`
- `src/panels/Dashboard/Jericho/TapeAnalyzerTutorial.jsx:87`
- `src/panels/Dashboard/Jericho/CompareTakes.jsx:187, 331, 461`
- `src/panels/Dashboard/Jericho/index.jsx:551`
- `src/panels/Dashboard/Jericho/TapeReview.jsx:48, 94, 578, 825, 965`
- `src/components/Shared/FocusMode.jsx:77`
- `src/components/Dashboard/FindAReaderCTA.jsx:47`
- `src/components/Dashboard/TutorialAchievement.jsx:115`
- `src/components/sceneStudy/AiScenePartner/components/RecordingPreview.jsx:129`

## Target

A shared `.dst-press` class giving every gradient CTA `scale(0.97)` press
feedback at 160ms on the app's standard curve. The app already does exactly
this for tab buttons — this extends that convention.

New CSS (add to `src/App.css`, directly below the `.aurora-tab-btn:active`
block that ends around line 236):

```css
/* Tactile press feedback for gradient CTAs — extends the aurora-tab-btn pattern. */
.dst-press {
  transition: transform 160ms cubic-bezier(.2,.7,.3,1);
}
.dst-press:active {
  transform: scale(0.97);
}
```

## Repo conventions to follow

- Exemplar: `.aurora-tab-btn:active { transform: scale(0.94); }` at
  `src/App.css:234-236`. Same idea, gentler scale for larger buttons.
- The app's standard curve `cubic-bezier(.2,.7,.3,1)`.
- Note: these elements carry Tailwind's `transition-all`; `.dst-press`'s own
  transition declaration coexists (last-loaded stylesheet wins on the
  `transition` property — App.css is imported after Tailwind's layers; verify
  in the feel check, and if Tailwind wins, add the transform transition to the
  `:active` rule too).

## Steps

1. **`src/App.css`** — add the `.dst-press` block from Target verbatim below
   the `.aurora-tab-btn:active` rule.
2. **Each of the 15 listed elements** — append ` dst-press` to the className
   string. Nothing else changes on the line. Do this file by file; re-grep
   `hover:shadow-lg` at the end and confirm every occurrence's className also
   contains `dst-press`.

## Boundaries

- Do NOT remove or modify `hover:shadow-lg` or `transition-all` — additive
  change only.
- Do NOT add `.dst-press` to any element not in the list (tab bars and other
  controls have their own patterns).
- No reduced-motion guard for this class — press feedback is comprehension
  feedback, and the repo's own `.aurora-tab-btn` press has none. Match the
  house pattern.
- No new dependencies, no markup changes.

## Verification

- **Mechanical**: `yarn build` clean; `grep -rn "hover:shadow-lg" src --include="*.jsx" | grep -v dst-press` returns nothing.
- **Feel check**: in the simulator (or browser with touch emulation), press and
  hold any gradient CTA (e.g. Tape Review's "Try again"): it scales down
  subtly while held, springs back on release in ~160ms. Confirm the scale
  actually transitions (not an instant snap) — if it snaps, Tailwind's
  `transition-all` won specificity; fix per the convention note above.
- **Done when**: all 15 CTAs respond to press; no visual change at rest or on
  hover-capable devices beyond what existed.
