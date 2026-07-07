# Studio → App Onboarding — MVP Spec (Studio Session Handoff Tool)

*Status: proposed, 2026-07-07. Prereq: run the v0 kit (`studio-onboarding-v0-kit.md`) first to validate the mechanic. Build this once clients bite.*

## Goal
Make the wow effortless: a **studio operator attaches a client's tape from today's session and fires the AI review; the client gets home to their tape + casting-grade notes already waiting** — no AirDrop dance, no self-upload. This is the activation moment for DST's warmest, highest-intent segment (in-person studio clients). See [[project_studio_moat_pivot]].

## Roles
- **Studio Operator** — DST staff running the session (needs a gated tool).
- **Client** — the actor who taped; may or may not already have an app account.

## The flow
```
STAFF SIDE (operator, at the studio)
  1. Open the Studio tool → "New session handoff"
  2. Enter client email (+ optional name/phone)
     → find existing account OR create a pending one
  3. Upload today's tape file (drag/drop from studio machine)
  4. (optional) add character/tone/sides context for sharper notes
  5. Tap "Prepare review" → tape attributed to client, review QUEUED

CLIENT SIDE (their phone)
  6. Receives push (if app installed) + SMS/email: "Your tape from today +
     AI casting notes are ready → [claim link]"
  7. Opens app → signs in / claims the pending account
  8. Accepts AI consent (gate — see below)  → the queued review RUNS
  9. Lands DIRECTLY on today's tape + the casting notes
 10. Tape + notes live in their library; between-visit loop begins
```

## Functional requirements
- **R1 — Operator gate.** A staff-only surface (new `studio_operator` role or reuse `is_staff`). Route e.g. `/studio` in the FE, BE endpoints permission-gated. Audit every on-behalf upload (operator id + client id + timestamp).
- **R2 — Find-or-create client.** By email (primary key for actors). Existing → attach to their account. New → create a **pending account** + a single-use **claim token**.
- **R3 — Attach tape.** Presigned R2 upload (reuse the existing `jerichoTapeReviewPresign` → R2 → job pipeline). The tape and resulting `AnalysisJob` are **owned by the client's user id**, not the operator's (mirrors the RevenueCat appUserID attribution lesson — attribute to the real identity or downstream breaks).
- **R4 — Queue the review, don't auto-run it.** Create the review job in a **pending-consent** state. It must NOT execute until the client has accepted AI consent (R5).
- **R5 — AI consent (hard gate, Apple 5.1.1 / privacy).** AI cannot run on the client's tape without their recorded consent. Two acceptable patterns:
  - **(a) Claim-time consent (recommended):** operator "prepares," client accepts consent when they claim → review runs then. Clean, defensible.
  - **(b) Booth consent:** client taps consent on the operator's device or their own before the operator prepares. Faster wow, but must be genuinely the client's tap.
- **R6 — Notify.** Push via existing device-token path if the app is installed (reuse the `tape_review_complete` type — it already deep-links to the tape tab in shipped builds). Always also send **SMS or email** with the claim link (covers not-yet-installed clients — the majority at first).
- **R7 — Claim deep-link.** The link opens the app (or web) straight to that tape + review, consuming the claim token and binding the pending account to the client.

## Reuse (most of this already exists)
| Need | Reuse |
|---|---|
| Tape upload + AI review | `jerichoTapeReviewPresign` / tape-review pipeline / `AnalysisJob` |
| Storage | R2 (existing) |
| Notify + deep-link | push device-token path; `tape_review_complete` already routes to the tab |
| Accounts / auth | existing user system |
| Land-on-their-tape | the free-review handoff (`dst_first_review` → TapeReview) hardened in PR #8 |
| Funnel metrics | the events shipped in PR #8, tagged `source: 'studio'` |

**The genuinely new build:** the operator tool (R1–R2), on-behalf attach + pending-consent job state (R3–R5), and the claim token/deep-link (R7). Everything else is wiring existing pieces.

## Data model (new)
- `StudioSession` — {operator_id, client_id (nullable until claim), tape/job ref, created_at, status: prepared|claimed|reviewed}. For tracking + the retention loop.
- Pending account + `claim_token` (single-use, expiring) on the user or a linked table.
- `AnalysisJob` gains a `pending_consent` state (or a flag) so R4/R5 hold.

## Permissions & privacy
- Operator uploads on-behalf **only with the client present and verbally agreeing**; formal AI consent captured in-app (R5). Document this in staff training.
- Client owns their tape + data; standard delete/export applies (existing moderation/compliance stack).
- Rate-limit / audit the operator tool to prevent misuse.

## Edge cases
- Client already active in the app → skip pending account; just attach + notify.
- Client declines AI consent at claim → they still get the tape in their library (no AI); offer consent again later.
- Large studio tape / slow upload → same handling as the normal analyzer; show progress.
- Client has no smartphone / won't install → email claim link opens the web app.
- Duplicate handoff for the same session → dedupe on tape + client.

## Metrics (tag `source: 'studio'`)
`studio_session_prepared → client_claimed → consent_accepted → review_completed → notes_viewed → repeat_review`. The prize metric: **% of studio-handoff clients who open the app again within 7 days** (between-visit stickiness) and **% who complete a second review** (the ACTIVE definition, from the warmest source).

## Phasing
- **MVP-1 (minimal wow):** R1–R7 with **email/SMS claim link only** (skip push-if-installed at first — most won't have the app yet). Operator tool as a simple gated web form. This alone delivers the "waiting when you get home" moment.
- **MVP-2 (polish):** push-if-installed, the `StudioSession` tracking dashboard, referral prompt at the notes screen, between-visit prep nudges.

## Open questions for Joseph (needed before build)
1. **Studio rig:** how are session tapes captured/exported today, and in what format/size? (Determines the upload step.)
2. **Client records:** do you already store client **emails** (a CRM / booking system)? If so we can pre-fill/auto-create accounts.
3. **Staff device:** what will operators run the tool on — the studio's computer, a tablet, a phone?
4. **Consent process:** are you comfortable with claim-time consent (a), or do you want booth consent (b)?
5. **Existing `is_staff` vs. new `studio_operator` role** — any other staff who shouldn't have this?

---
*Next: validate with the v0 kit → answer the 5 questions above → I scope MVP-1 into concrete BE endpoints + FE screens and build it.*
