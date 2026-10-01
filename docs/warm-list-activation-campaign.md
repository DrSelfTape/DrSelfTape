# Warm List Activation Campaign — 2k Dr Self Tape Actors

*Goal: turn the owned 2,000-actor email list (warm — they know Dr Self Tape) into app activations, via a free AI Tape Review offer. This is the studio-moat growth engine: free, warm distribution instead of paid cold ads. See [[project_studio_moat_pivot]].*

**⚠️ Prereq: PR #8 must be LIVE on web first.** The email links land on `app.drselftape.app`; if the old upload-only flow is still live, you burn your best audience on a broken first impression. Sequence: merge PR #8 → web deploys → *then* send.

## The offer
**A free, casting-grade AI review of your self-tape** — framing, eyeline, your choices, the performance arc, and the one thing to fix. From Dr Self Tape. Takes 2 minutes.

## Voice & rules
- Warm, direct, actor-to-actor / founder voice. You already know them.
- **No fabricated stats** (no "5× callbacks") — honest specificity only. Trust is the whole asset with a warm list.
- One clear CTA per email. Link → `app.drselftape.app` with tracking (below).

## Segments (send tailored if the ESP allows; otherwise send the base to all)
1. **Studio clients** (warmest) — "you've taped with us; now get AI notes between visits"
2. **Leads / past inquiries** — "you know Dr Self Tape; here's something new + free"
3. **Dormant** (not emailed in months) — gentle re-engagement, send LAST after warming the domain

## Tracking
- Link: `https://app.drselftape.app/?utm_source=email&utm_medium=warmlist&utm_campaign=free_review&utm_content=<email#>`
- Measure: opens → clicks → signups → **free-review completions** (the funnel events we shipped light this up once the PostHog key is set).
- Prize metric: **% of clickers who complete a first review** (activation) and **% who return within 7 days**.

---

## Email 1 — the offer
**Subject line options (A/B):**
- `Your self-tape, reviewed by AI casting eyes — free`
- `See what casting sees in your tape (free, from us)`
- `We built you something: instant notes on your self-tape`

**Body:**
> Hey {first_name},
>
> You know the worst part of self-taping: you send it off and hear… nothing. No idea if it landed.
>
> So we built the thing that answers back. Upload a self-tape (or record one right in the app) and get **casting-grade notes in about a minute** — your framing, eyeline, the choices you made, and the *one thing* that'll raise your ceiling most.
>
> It's free. It's from Dr Self Tape. It takes two minutes.
>
> **→ Get your free Tape Review**  [{tracked link}]
>
> Curious what it says about your next audition tape? Go find out.
>
> — {founder name}, Dr Self Tape
>
> *P.S. No tape handy? The app will record one with you right there.*

---

## Email 2 — non-openers (send ~3-4 days later, new subject)
**Subject line options:**
- `Did you see this? Free AI notes on your tape`
- `The tool actors are quietly using before they submit`
- `{first_name}, your free Tape Review is still here`

**Body:** *(shorter, punchier — re-send the offer)*
> {first_name} — quick one.
>
> We're giving every actor on our list a **free AI Tape Review** — casting-grade notes on your self-tape in about a minute. Framing, eyeline, your choices, the one fix that matters most.
>
> Free. Two minutes. **→ Try it**  [{tracked link}]
>
> — {founder name}

---

## Email 3 — clicked/opened but didn't finish (send ~5 days later)
**Subject line options:**
- `You started — here's your Tape Review`
- `One tape away from real notes`

**Body:**
> {first_name},
>
> You checked out the Tape Review but didn't run one yet — totally get it, life's busy.
>
> Here's the thing: the actors getting the most out of it are the ones who ran it on a tape they'd *already submitted* — and found the note they wish they'd caught first. **It's free, and it's fast.**
>
> **→ Run your free review**  [{tracked link}]
>
> Next audition, walk in knowing your tape lands.
>
> — {founder name}

---

## Send plan
1. **Warm-up** (if the list is dormant): send to your most-engaged ~200 first, watch open/spam rates, then scale.
2. **Batch** the 2k over 2-3 days (don't blast 2k at once from a cold domain — deliverability).
3. **Email 1** to all → **Email 2** to non-openers (day 4) → **Email 3** to clicked-no-complete (day 6).
4. Watch the funnel; if warm actors activate well → this replaces cold ad spend as the acquisition engine.

## What I need from you to finalize
- **ESP** (Mailchimp / ConvertKit / Wix / Resend / other) → so I can format for it / set up the sends
- **Founder name / sign-off** to use
- **List freshness** (recently emailed vs. dormant) → sets the warm-up plan
