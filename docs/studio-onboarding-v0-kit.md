# Studio → App Onboarding — v0 Kit (no engineering)

*Goal: validate the studio-moat mechanic before building tooling. Turn every in-person taping session into a warm, sticky app user — by handing the client their tape + a casting-grade AI review before they leave. Run this on your next ~10 clients and see who bites.*

**The one wow line (say it out loud):**
> "Before you go — want your tape and AI casting notes on your phone? Takes a minute."

---

## The moment
End of the session. Tape is done, the client is relieved (peak emotional moment). That's when you make the ask — not at the start, not by email later. **In the room, at the peak.**

---

## Setup (one-time, ~15 min)
1. **Booth QR code** → point it at **`https://app.drselftape.app`** (mobile web — zero install, the free-review flow works in the phone browser). Print the card below and stand it at the taping booth / checkout.
2. **A way to get today's tape onto their phone** — pick whatever your rig supports:
   - **AirDrop** (fastest for iPhone clients), or
   - text/email the file to them, or
   - **fallback:** have them record a fresh 30-sec take *in the app* right there (the in-app recorder works now).
3. Brief whoever runs sessions on the 30-second script below.

### Booth card copy (print this)
```
┌─────────────────────────────────────┐
│   GET YOUR TAPE + AI CASTING NOTES   │
│         ON YOUR PHONE — FREE          │
│                                       │
│            [ QR CODE ]                │
│                                       │
│   Scan → we'll load today's tape →   │
│   AI casting-grade notes in seconds   │
│                                       │
│         Ask us — takes a minute       │
└─────────────────────────────────────┘
```

---

## Staff script (30–60 sec, word-for-word)
> **You:** "Before you head out — want your tape *and* AI casting notes on your phone? It's free, takes a minute."
>
> *(they say yes)*
>
> **You:** "Scan this code." *(they scan the QR → app opens in their browser)*
> "Sign up real quick — email or Apple, whatever's faster." *(they sign up)*
> "It's going to offer you a **free Tape Review** — tap that."
> "Now let's get today's tape in — I'll **AirDrop it to you**." *(send the file → they pick it in the upload step)*
> *(or: "just record a quick 30-second take right here to see how it works")*
> "Hit go. Give it a sec…" *(the AI review runs)*
>
> **You (while it processes):** "This reads your framing, eyeline, your choices — the stuff casting actually clocks. You'll get **the one thing** to work on before your next audition."
>
> *(review lands)*
>
> **You:** "That lives in your app now. Work on that note, re-tape at home, come see us for the next big one. And if you know an actor who'd want this — send them our way."

---

## What the client does in-app (the exact steps)
1. Scan QR → `app.drselftape.app` opens
2. **Sign up** (email or Apple)
3. Onboarding shows the **free Tape Review offer** → tap it
4. **Accept the AI consent** prompt (required — it's how we can run AI on their tape)
5. **Upload** the tape you AirDropped *(or tap "Record one now" for a quick take)*
6. Wait ~1–2 min → **AI casting notes** appear
7. Their tape + notes now live in their library

---

## What to track (manual tally for now)
Keep a simple sheet for the pilot — one row per client:

| Client (name/email) | Offered? | Signed up? | Got a review? | Came back to app later? | Notes |
|---|---|---|---|---|---|

- **Offered → signed up** = how compelling the ask is
- **Signed up → got a review** = does the aha land in-session
- **Came back later** = the real prize (between-visit stickiness)

*(Once the PostHog key is set, the funnel events we shipped — `first_review_offer_shown → upload_shown → started → completed → notes_viewed → repeat` — track this automatically. For the pilot, the sheet is enough.)*

---

## Gotchas / notes
- **The tape lives on studio gear, not their phone** — this is the one real friction. AirDrop is smoothest; the in-app record fallback removes it entirely (slightly less "wow" than their real tape, but zero transfer).
- **AI consent is required** before the review runs (Apple/privacy) — the app prompts for it; just tell them to accept.
- **Mobile web is fine for v0** (no install), but the **native app is the richer experience** (push notifications for "notes ready," offline library). Once they're hooked, nudge the install: iOS `id6770320460`, Android `com.drselftape.app`.
- **Ask for the referral at the peak** (end of the wow), not later — that's when they're most impressed.

---

## Success bar for the pilot
If **most clients who are offered it sign up and get a review in-session**, and **a meaningful chunk open the app again within a week** → the mechanic works → build the MVP handoff tool (see `studio-onboarding-spec.md`) so *you* attach the tape and it's waiting when they get home, no AirDrop dance.
