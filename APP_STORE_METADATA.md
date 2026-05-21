# App Store Connect — submission metadata

Drafted for first iOS submission. Copy/paste into App Store Connect.
URL: https://appstoreconnect.apple.com → Dr Self Tape → App Information / Version 1.0

---

## App Information (one-time, applies to all versions)

**Name** (30 chars): `Dr Self Tape`
**Subtitle** (30 chars, shown under title): `Self-Tape Studio for Actors`
**Bundle ID**: `com.drselftape.app`
**Primary Category**: Entertainment
**Secondary Category**: Productivity
**Content Rights**: Does not contain third-party content
**Age Rating**: 12+ (Infrequent/Mild Profanity or Crude Humor — performance content may include scene work)

**Privacy Policy URL**: `https://drselftape.app/privacy-policy.html`
**Marketing URL** (optional): `https://drselftape.app/`
**Support URL**: `https://drselftape.app/support` *(or use a Notion/Help page; can also be `mailto:info@drselftapes.com` styled as a help page)*

---

## Version 1.0 — Localized Metadata (English, US)

### Promotional Text (170 chars — editable without re-review)
```
The fastest way to self-tape. Live readers, AI scene partner, audition tracking, and a CD-style review tool — all in one place. Built by actors, for actors.
```

### Description (4000 chars)
```
Dr Self Tape is the only self-tape studio that doubles as your scene partner, your reader, and your casting eye.

Whether you're prepping for a big audition tonight or building a daily craft habit, Dr Self Tape gives you everything you need to deliver tape-ready work — fast.

WHAT'S INSIDE

• AI Scene Partner — Drop in any sides, pick a character, and run the scene with an AI that reads with you, takes notes, and adjusts tone on the fly.

• Live Readers Marketplace — Match with vetted human readers for live scene work. Tinder-style swipe to find your fit by accent, age range, time zone, and price. Rate them after — see who shows up on time, who brings energy, who's worth booking again.

• Self-Tape Recording — One-tap record, cloud sync, instant playback. Multi-take review, side-by-side compare, and trim without leaving the app.

• CD Simulation — A first-pass review tool that flags pacing, eye line, framing, and energy drops the way a casting director might. Critical, not generic.

• Audition Tracker — One screen for every audition, every submission, every callback. Stats on response rate, booking rate, and what kinds of roles you're getting traction in.

• Scene Journal — Quietly capture what you tried, what landed, and what to bring next time. Build your craft on signal, not on memory.

• Focus Mode — Optional distraction-free recording: blur the world, hide the chrome, just you and the scene.

WHO IT'S FOR
Actors at every level — from drama-school grads building reels, to working actors juggling 5+ tapes a week. If you've ever cried in a corner trying to get one good take before bed, this app is for you.

NO READERS ON HAND? NO PROBLEM.
The AI Scene Partner runs offline-friendly and means you'll never have to skip a tape because your friend cancelled. When you do want a real human, the Marketplace is one tap away.

SUBSCRIPTIONS
Dr Self Tape is free to download. Some features (AI Scene Partner, unlimited cloud storage, premium reader credits) are part of an optional subscription. You can manage or cancel any time via Settings → Subscriptions on your device.

QUESTIONS
Email info@drselftapes.com — a real human (usually the founder) reads every message.
```

### Keywords (100 chars, comma-separated, no spaces after commas)
```
self tape,acting,actor,audition,scene partner,reader,casting,headshot,monologue,coach,rehearse,sides
```

### What's New in This Version (4000 chars)
```
Welcome to Dr Self Tape 1.0.

This is the first public release. You can:
• Run scenes with the AI Scene Partner
• Match with live readers in the Marketplace
• Record, review, and store self-tapes in the cloud
• Track every audition, submission, and callback in one place
• Use CD Simulation for a fast critique pass before you submit

If something doesn't work the way you expect, email info@drselftapes.com — we read every message and ship fixes fast.
```

### Support URL footer text (for the Support page itself)
- Contact: info@drselftapes.com
- Privacy: https://drselftape.app/privacy-policy.html
- Terms: *(add if you have one)*

---

## Build & Signing

- **Bundle Identifier**: `com.drselftape.app`
- **Team ID**: `4NUZBYLSDQ`
- **Code Sign Style**: Automatic
- **Marketing Version**: `1.0`
- **Build Number**: increment with each TestFlight upload (start at `1`)

---

## In-App Purchases (RevenueCat)

Configure these in App Store Connect → Features → In-App Purchases, **then** mirror them in RevenueCat dashboard. Product IDs must match `${plan}_${billing}` (the convention in `src/utils/purchases.js`):

- `basic_monthly` — Auto-Renewable Subscription
- `basic_yearly` — Auto-Renewable Subscription
- `premium_monthly` — Auto-Renewable Subscription
- `premium_yearly` — Auto-Renewable Subscription
- `plus_monthly` — Auto-Renewable Subscription
- `plus_yearly` — Auto-Renewable Subscription

*(Cross-check the actual plan tiers in `src/panels/Dashboard/Membership/index.jsx` before creating products. Don't create products that aren't in the UI.)*

Group all auto-renewables in **one Subscription Group** so users can upgrade/downgrade within a single tier ladder.

---

## App Review Information

- **Sign-in required**: Yes
- **Demo Account**:
  - Email: *(create a reviewer-only account, e.g. `apple-reviewer@drselftapes.com` with a test subscription enabled)*
  - Password: *(strong, share via ASC only)*
- **Notes for Reviewer**:
  ```
  Thanks for reviewing Dr Self Tape.

  Demo account has access to all paid features so you don't need to purchase.
  Sign in via email + password on the launch screen.

  Key flows to test:
  1. Tap "Record Tape" → grant camera + mic → record a 5-second clip → review.
  2. Tap "Find a Reader" → swipe through reader cards → tap one to view profile.
  3. Tap "AI Scene Partner" → choose a sample scene → run a turn.
  4. Settings → Subscriptions: should open Apple's native subscription management.
  5. Membership → Restore Purchases: required by guideline 3.1.1, works without active purchase.

  No special hardware required. Tested on iPhone 15 Pro (iOS 18) and iPhone SE (iOS 17).
  ```

- **Contact**: info@drselftapes.com / phone *(your number)*

---

## Screenshots (REQUIRED — capture these next)

App Store Connect requires screenshots for each device size you support. Since `UISupportedInterfaceOrientations~ipad` is set, you support iPad — so iPad screenshots are required too.

| Device | Resolution | Required? |
|---|---|---|
| iPhone 6.9" (15 Pro Max / 16 Pro Max) | 1290×2796 portrait | **Yes** |
| iPhone 6.5" (older Pro Max) | 1242×2688 portrait | Optional if 6.9" provided |
| iPad Pro 13" (M4) | 2064×2752 portrait | **Yes** (supporting iPad) |
| iPad Pro 12.9" (older) | 2048×2732 portrait | Optional if 13" provided |

Minimum 3 screenshots per size, max 10. Recommended 5–6 showing: 1) Hero feature, 2) Find a Reader, 3) AI Scene Partner, 4) Audition Tracker, 5) Membership.

Capture from the simulator:
```bash
# pick a simulator, e.g. "iPhone 16 Pro Max"
xcrun simctl boot "iPhone 16 Pro Max" 2>/dev/null
xcrun simctl io booted screenshot ~/Desktop/dst-1-home.png
# repeat for each screen, then resize/annotate in Figma or upload raw
```

---

## Pre-flight checklist before hitting "Submit for Review"

- [ ] `VITE_REVENUECAT_IOS_KEY` set in Vercel env (production) AND in any local `.env` used for the cap build
- [ ] RevenueCat dashboard: iOS app added, App Store Connect shared secret pasted, products created and matched to ASC IAPs
- [ ] App Store Connect: app record created at com.drselftape.app
- [ ] Subscription Group created, all `*_monthly`/`*_yearly` products inside it, localizations + screenshots per product (Apple requires 1 screenshot per subscription)
- [ ] Demo account exists and has an active subscription (or can complete one with sandbox)
- [ ] Archive build in Xcode (Product → Archive), upload via Organizer → Distribute App → App Store Connect
- [ ] TestFlight: install on a real device, verify push notifications register, verify Restore Purchases works
- [ ] Screenshots uploaded for required sizes
- [ ] All metadata above pasted into ASC
- [ ] Build attached to v1.0 in ASC → Submit for Review
