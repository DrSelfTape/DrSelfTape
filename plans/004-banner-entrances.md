# 004 — Banner entrances (Update + Announcement)

- **Status**: DONE (2026-07-28, executor + review)
- **Commit**: c428264 (working tree also carries plans 001-003, unrelated files)
- **Severity**: MEDIUM (both app-top banners teleport in on launch)
- **Category**: Missed opportunities / preventing a jarring change
- **Estimated scope**: 3 files (`src/App.css`, `src/components/UpdateBanner.jsx`, `src/components/AnnouncementBanner.jsx`), ~12 lines

## Problem

Both server-driven banners appear with zero transition:

- `src/components/UpdateBanner.jsx:89-107` — a `position: fixed` bar that pops
  over the top of the app when a new native version exists.
- `src/components/AnnouncementBanner.jsx:63-69` — an in-flow card that appears
  at the top of the feed when an announcement is set.

Current UpdateBanner root:

```jsx
  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        ...
```

## Target

Both banners enter with a 200ms fade + small downward settle on the app's
standard curve. No exit animation (dismiss unmounts instantly — accepted, out
of scope). Transform/opacity only; the in-flow banner's layout space may
appear instantly (do NOT animate height).

New CSS (add to `src/App.css`, directly after the `.tr-reveal` reduced-motion
block added by plan 001):

```css
/* Server-driven banner entrance (UpdateBanner, AnnouncementBanner). */
@keyframes dst-banner-in {
  0%   { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 1; transform: translateY(0); }
}
.dst-banner-in {
  animation: dst-banner-in 200ms cubic-bezier(.2,.7,.3,1) both;
}
@media (prefers-reduced-motion: reduce) {
  .dst-banner-in {
    animation: none !important;
  }
}
```

## Repo conventions to follow

- Keyframes + class + reduced-motion guard together in `src/App.css`; exemplar:
  the `.tr-reveal` block (or `.aurora-page-in` at `src/App.css:682-693`).
- Standard curve `cubic-bezier(.2,.7,.3,1)`; transform/opacity only.

## Steps

1. **`src/App.css`** — add the `dst-banner-in` block from Target verbatim after
   the `.tr-reveal` reduced-motion block. If `.tr-reveal` is absent (plan 001
   not executed), place it after `.aurora-page-in`'s guard instead.
2. **`src/components/UpdateBanner.jsx`** — on the root `<div` of the `return`
   (the `position: "fixed"` element, line ~90), add
   `className="dst-banner-in"` (the element currently has no className).
3. **`src/components/AnnouncementBanner.jsx`** — on the root `<div` of the
   `return` (line ~64, the `margin: "4px 12px 12px"` card), add
   `className="dst-banner-in"` (currently no className).

## Boundaries

- Entrance only. Do NOT add exit/dismiss animation, do NOT restructure either
  component, do NOT touch their fetch/dismiss logic or tracking calls.
- Do NOT animate height, margin, or padding.
- These banners mount once per appearance; the animation replaying on remount
  (e.g. app relaunch) is correct behavior.
- If either component's root already has a className (drift), append the class
  instead of replacing.

## Verification

- **Mechanical**: `yarn build` clean.
- **Feel check**: temporarily force each banner to render (e.g. in dev, return
  early `true` from its visibility conditions — revert after): banner fades in
  with a small settle from above in ~200ms; no layout jank beyond the space
  appearing; reduced-motion emulation shows it instantly.
- **Done when**: both banners animate in, `yarn build` clean, no logic diffs
  beyond the two className additions and the CSS block.
