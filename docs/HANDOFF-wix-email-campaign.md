# HANDOFF — Build the Warm-List Activation Campaign in Wix

*For a coworking session (agent or human) to pick up and ship. Self-contained. Created 2026-07-07.*

---

## ▶ START HERE — live execution state (inspected the real Wix account 2026-07-07 ~12:30pm)

**Account:** Wix Studio → "Dr Self tape" (dashboard site `bb2f9536-a572-4a68-b974-ad25c664ffa3`) → Ascend Business Tools, **FREE tier** ("Upgrade Ascend" prompt shows — but the send below fits free).

**The audience — REAL numbers (this is the whole ballgame):**
- **3,179 total contacts**, labeled by **studio session** ("One Hour Session", "Thirty Minute Session", "Attendees_…"). → These ARE the in-person studio-client actors. Confirms the studio-moat thesis. (e.g. Laquan Copeland is here AND is active in the app.)
- **✅ 641 = EMAIL SUBSCRIBERS (opted in) = THE ONLY SENDABLE LIST. Send Email 1 to these.**
- **⛔ ~2,538 = "NEVER SUBSCRIBED"** — studio clients who booked but never opted into marketing email. **DO NOT email them** (Wix blocks it + CAN-SPAM/spam-complaint/deliverability risk). Unlock them LATER via a re-permission ask or by capturing email consent at their next studio visit (ties to `studio-onboarding-v0-kit.md`).
- Segments already in the account: **"Active subscribers" (27)**, **"Email subscribers" (641)**, "Engaged with emails" (createable), "Demo Label" (0 — ignore).

**Prereq met:** `app.drselftape.app` is LIVE with the fixed no-tape flow (PR #8 merged + Vercel-deployed 2026-07-07). Links are safe to send.

**Immediate playbook — guide Joseph click-by-click (he screenshots each step):**
1. **Deliverability FIRST:** Email Marketing → settings → **authenticate the sending domain** (SPF/DKIM). Kick off early (DNS propagation). Do NOT mass-send before this.
2. **Create Email 1:** Marketing → Email Marketing → **Create Email** → "Create your own" or a **simple single-column newsletter** (personal-note feel, not a designed promo).
3. **Paste** the Email 1 subject + body from `warm-list-activation-campaign.md`. Insert Wix **First Name** personalization in the greeting. Add the **CTA button** → tracked link (`utm_content=email1`).
4. **Recipients — WARM-UP first:** send to **"Active subscribers"/"Engaged with emails"** segment → watch opens/spam a few hours → then the full **"Email subscribers" (641)**.
5. **Day 4:** Email 2 → non-openers. **Day 6:** Email 3 → clicked-but-didn't-complete.

**Still need from Joseph:** (a) are the 641 emailed recently or dormant? (warm-up caution) (b) sign-off name for the emails (c) the sending domain to authenticate. Free-tier send cap should cover 641 — confirm at send.

---

## Mission
Build and send a **3-email campaign in Wix** to Dr Self Tape's warm list — **641 opted-in email subscribers** (of 3,179 total studio-client contacts; the ~2,538 non-subscribed are off-limits, see START HERE), offering a **free AI Tape Review**, to activate them into the app. This is DST's warm, owned growth engine — replaces paid cold ads.

## Why (context — don't skip)
- DST's app active-users are the physical studio's **in-person clients** → strategy pivoted to **studio-moat / companion** (deepen warm relationships, don't chase cold strangers).
- The **2k list is warm** (they know Dr Self Tape) and is the middle ground between in-studio clients (warmest) and cold ads (coldest). If they activate → the app scales via owned distribution. Cold Meta ads produced ~0 activation; this list is the better channel.
- Full strategy: `docs/activation-strategy-2026-07-07.md`, `docs/warm-list-activation-campaign.md` (the copy), `docs/studio-onboarding-*` (the sister studio play).

## ✅ Current state / prerequisite (met)
- **PR #8 is merged + LIVE on web** (Vercel, `main` @ `1e170a1`, 2026-07-07). So `app.drselftape.app` now serves the **fixed** no-tape flow (record-in-app + honest sample + free-first-review). **Safe to send** — links no longer hit a broken upload-only dead-end.
- Funnel instrumentation is live client-side; it lights up in PostHog once the PostHog key is set (separate task).

## The offer
**A free, casting-grade AI review of your self-tape** — framing, eyeline, choices, arc, and the one thing to fix. From Dr Self Tape. ~2 min.

## Rules
- Warm, direct, actor-to-actor founder voice.
- **NO fabricated stats** (no "5× callbacks") — honest specificity only. Trust is the whole asset.
- One CTA per email → the tracked link below.

## Tracked link (put on every CTA button)
```
https://app.drselftape.app/?utm_source=email&utm_medium=warmlist&utm_campaign=free_review&utm_content=email1
```
(bump `email1` → `email2` / `email3` per email so we can tell which drove signups)

---

## The 3 emails (copy is final — paste as-is)
> Full copy with subject-line A/Bs lives in **`docs/warm-list-activation-campaign.md`**. Summary:
> - **Email 1 — the offer.** Subject A/B e.g. *"Your self-tape, reviewed by AI casting eyes — free"* / *"See what casting sees in your tape (free, from us)"*. Body: the feedback-void pain → free casting-grade notes in ~1 min → CTA. P.S.: "No tape handy? The app records one with you."
> - **Email 2 — non-openers (day 4, new subject).** Shorter re-send of the offer.
> - **Email 3 — clicked-but-didn't-finish (day 6).** "You started — here's your Tape Review." Social-proof nudge.
>
> Personalization: use Wix's **First Name** merge tag in the greeting (UI: Personalize dropdown; API/contacts field: `info.name.first`).

---

## BUILD PATH A — No-code (Wix Dashboard, recommended for Joseph)
0. **⚠️ Deliverability first (critical for 2k):** Wix Dashboard → Marketing & SEO → Email Marketing → **verify/authenticate your sending domain** (SPF/DKIM). Sending 2k from an unauthenticated domain tanks inbox placement. Do this before anything else.
1. **Contacts / segments:** Wix Dashboard → **Contacts** → confirm the 2k are imported (if they're a CSV, import first). Create/apply **labels**: `studio-clients`, `leads`, `dormant`. Labels = the segments you'll send to.
2. **Create campaign:** Marketing & SEO → **Email Marketing** → Create Campaign → pick a clean single-column template → paste Email 1 copy → set sender name/email → insert the **First Name** personalization → add the **CTA button** with the tracked link (utm_content=email1).
3. **Send/schedule:** send to the `studio-clients` + `leads` labels first (warmest). Scheduling ≥30 min out **requires a paid Email Marketing plan** (see gotchas).
4. **Warm-up + batch:** send to your **most-engaged ~200 first**, watch open/spam rates, then scale to the rest over 2–3 days. Send `dormant` LAST.
5. **Drip:** after ~4 days, duplicate the campaign as **Email 2**, send to **non-openers** (Wix lets you resend to people who didn't open). Day 6 → **Email 3** to those who **clicked but didn't complete** a review (cross-reference app signups / PostHog once the key is live).

## BUILD PATH B — API / Velo (for a dev cowork)
*(Grounded in current Wix docs via Context7 — `/websites/dev_wix`.)*
- **Create then publish a campaign:** `POST https://www.wixapis.com/email-marketing/v1/campaigns/{campaignId}/publish` with:
  ```json
  { "emailDistributionOptions": {
      "emailSubject": "See what casting sees in your tape (free)",
      "labelIds": ["<studio-clients-label-guid>", "<leads-label-guid>"],
      "sendAt": "<ISO, ≥30 min out — needs plan upgrade>"
  } }
  ```
  Returns stats: `delivered / opened / clicked / bounced / complained`.
- **Segment by label:** `labelIds` (or explicit `contactIds`) in the publish call.
- **Sending domain auth:** `POST /emails/sending-domains/authenticate-sending-domain` (SPF/DKIM) — same deliverability step as Path A step 0.
- **Automated drip / triggered emails:** Velo `import { triggeredEmails } from '@wix/site-crm'; triggeredEmails.emailContact(emailId, contactId)` — for behavior-triggered follow-ups (e.g., "signed up but no review in 3 days"). Set up the triggered-email templates in Dev Tools → Triggered Emails first.
- Auth: standard Wix API auth header.

## Measurement
- **Wix side:** the publish response + Email Marketing dashboard → delivered / opened / clicked / bounced / complained.
- **App side:** the UTM link + the funnel events shipped in PR #8 (`first_review_offer_shown → upload_shown → started → completed → notes_viewed → repeat`) — visible in **PostHog once the key is set**.
- **Prize metric:** % of clickers who **complete a first review** (activation), and % who **return within 7 days**. If warm actors activate well → shift budget/energy here, away from cold ads.

## ⚠️ Gotchas
- **Deliverability is do-or-die** — authenticate the sending domain + warm up + batch, or you'll land in spam and burn the list.
- **Only email the 641 SUBSCRIBED contacts.** The ~2,538 "never subscribed" are off-limits (Wix blocks + CAN-SPAM risk). Re-permission them later; don't blast.
- **Plan:** 641 fits the FREE Ascend tier (free caps ~monthly sends but 641 is well under). Scheduling ≥30 min out needs a paid plan — not required if sending immediately. Confirm at send.
- **Dormant list = extra caution:** if the 641 haven't been emailed recently, start with the engaged/active segment (27) first, then the rest.
- **Don't send before web is confirmed green** (it is — PR #8 live — but re-verify `app.drselftape.app` loads the free-review offer on a phone before mass send).

## Inputs still needed from Joseph
1. **Sign-off name** for the emails (e.g., "— Joseph, Dr Self Tape").
2. **List freshness** — have the 641 been emailed recently, or dormant? (sets warm-up.)
3. **Sending domain** to authenticate (the from-address domain).

*Already answered from inspecting the account: contacts are in Wix (3,179; 641 subscribed = sendable); free Ascend tier fits the 641 send; segments exist ("Active subscribers" 27, "Email subscribers" 641).*

## Definition of done
Sending domain authenticated → Email 1 sent to warm segments (batched, post warm-up) → Email 2 (non-openers, day 4) → Email 3 (clicked-no-complete, day 6) → results tracked in Wix + PostHog → decision: does the warm list activate well enough to make it the primary acquisition channel?

---
*Companion assets: `docs/warm-list-activation-campaign.md` (full copy), `docs/studio-onboarding-v0-kit.md` (the in-person sister play), `~/Downloads/dst-studio-booth-qr.png`.*
