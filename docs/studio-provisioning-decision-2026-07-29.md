# Studio Session Provisioning (P3-01) — decision doc

*2026-07-29. Ten-minute read; five decisions at the bottom. Nothing builds until they're made.*

## The play

Every client of the physical studio has already paid $40–60, already stood in our light, and already trusts the brand — then walks out unconverted. The build: **booking a studio session provisions an app account, the operator uploads the finished tape to it, and a free Tape Review is pre-run so the "your notes are ready" push lands before they leave the parking lot.** Highest-converting acquisition channel available, at zero ad spend, and it operationalizes the studio-moat thesis: the app becomes what studio clients get for being studio clients.

## What already exists (this is mostly wired)

| Piece | State |
|---|---|
| Wix Bookings → Django sync | **LIVE** — `apps/wix_sync` pulls bookings with `customer_email`, name, phone |
| Booking ↔ account link | `BookingSession.actor` FK exists, nullable, currently never set from Wix pulls |
| Free review grant | Server-side one-free-review machinery LIVE (reinstall-proof, refund-on-failure) |
| "Notes are ready" push | Verified end-to-end 7/28 (APNs + FCM + tap-router to the Review tab) |
| Set-password flow | Forgot-password plumbing exists — doubles as the magic link for provisioned accounts |
| Tape library storage | Self-Tapes upload path exists (R2) |

The genuinely new work is four small pieces: match-or-create the account on booking pull (S), the operator upload surface (M), the pre-run review trigger with an internal no-charge flag (S), and the welcome email (S). **Total ≈ 2–3 days**, no new consent landmines if D1 is framed as service delivery.

## The flow, end to end

1. Client books at drselftapes.com → Wix sync pulls the booking → account matched by email or created (marked `source=studio`), booking's `actor` FK set.
2. Booking confirmation email (ours, not Wix's): "Your session comes with the Dr Self Tape app — your tape and casting notes will be waiting there. Set your password →".
3. Session happens. Operator uploads the finished file against the booking (target: under 60 seconds of operator effort or it won't happen).
4. Upload triggers: tape lands in the client's Self-Tapes library + a Tape Review runs on the house (internal flag, no token math).
5. Notes finish → push + email: "Your casting notes from today's session are ready." Client opens the app to a library that already has their tape and a review that already exists. Day-0 aha with zero effort on their part.
6. `source=studio` tag on the account → we finally measure studio→app activation as its own funnel (feeds P4-01 attribution later).

## The five decisions (this is the ten minutes)

**D1 — Account creation: automatic for every booking, or opt-in checkbox at booking?**
Recommendation: **automatic**. They're paying clients receiving their deliverable through the app; the email frames it as where your tape lives, not a signup. Opt-in would gut the conversion and the checkbox real estate on Wix is ugly.

**D2 — The welcome email sender + copy.**
Sent from info@drselftapes.com via existing infra — fine for one transactional email per booking (the Gmail-throttle problem was bulk broadcast; single sends are safe). Copy needs your voice — I'll draft, you red-pen.

**D3 — Operator flow: who uploads, and how fast?**
The parking-lot promise needs upload-to-review-start within minutes of session end. Recommendation for v1: a **Django admin action** on the booking row (pick file → "Upload & run review") — ugly, internal, under 60 seconds, shippable in a day. A pretty operator page is a v2 luxury. Decision: who's the operator day-to-day, and is same-session upload realistic with your current studio flow?

**D4 — Free review: every session, or first session only?**
Recommendation: **every session**. It's the deliverable now — "$40 session includes AI casting notes" is a studio marketing line, a price-justifier, and a retention loop in one. Marginal cost is one review per paid session.

**D5 — Which Wix services qualify?**
Self-tape sessions obviously. Coaching sessions, memberships, Season Pass holders? Recommendation: start with self-tape session services only (they produce a tape); expand later.

## Explicitly out of scope (v1)

Operator-facing polish, multi-tape sessions (v1 = one hero take per session), auto-pulling video from the studio's storage (v1 is manual upload), and any change to Wix-side booking UX.

## Success metric

Studio clients who open the app within 48h of their session, and studio-cohort activation (first review *viewed*) vs. the general funnel. Both readable once accounts carry `source=studio`.
