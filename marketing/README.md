# Dr Self Tape — App Store screenshot deck

Editorial cinematic deck for App Store Connect, marketing site hero, and
Meta/X creative.

## Files

- `screenshots.html` — the deck. 7 screens at iPhone 6.9" App Store spec
  (1320 × 2868). Open in any browser to review at 27% scale.
- `export.mjs` — Puppeteer script that renders each `.screen` panel as a
  full-resolution PNG into `exports/`.
- `exports/` — generated PNGs, gitignored.

## Quick start

```bash
# One-time setup (downloads Chromium ~170 MB)
npm install puppeteer --no-save

# Export all 7 screens as 1320×2868 PNGs (~2x scale = 2640×5736 actual)
node marketing/export.mjs

# Outputs:
#   exports/01-hero.png
#   exports/02-ai-coach.png
#   exports/03-selftape-studio.png
#   exports/04-find-a-reader.png
#   exports/05-tracker.png
#   exports/06-craft-journey.png
#   exports/07-privacy.png
```

Upload the exported PNGs directly to App Store Connect → Dr Self Tape →
1.0 Prepare for Submission → iOS 6.9" Display screenshots.

The same PNGs can be uploaded to the 6.7" Display slot — App Store
Connect accepts the larger 1320×2868 image in the 6.7" slot since the
spec changed in iOS 26.

## Iterating

Edit `screenshots.html` directly. The deck uses:
- DM Serif Display for headlines
- Inter for body + UI
- JetBrains Mono for eyebrows + UI labels
- Caveat for hand-drawn flourishes
- Aurora design tokens: gold (#D4A85F), deep gold (#7A5A18), mint
  (#A7ECDA), coral (#FF8280), cream (#FFFDF8)

Photos sourced from `public/photos/` (same set used in the live app).
Replace with new Higgsfield generations by dropping new PNGs into
`public/photos/` and updating the `background-image` URLs in the deck.

## What's excluded from Vercel

The whole `marketing/` directory is in `.vercelignore` so screenshot
sources never ship to drselftape.app.
