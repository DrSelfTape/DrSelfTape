# Meta Attribution Bridge — spec

**Problem (verified 2026-07-11):** ads point at the App Store, so the ad-click ID (`fbc`) never reaches the app. In-app Subscribe events land via CAPI with 0% `fbc`/`fbp` → conversions are **measured but not attributable** to a specific ad. EMQ on Subscribe is 6.2 (email/ip/ua/external_id all 100%) — so email is a strong join key we're not yet exploiting.

**Fix:** insert a fast web landing page between the ad and the App Store. It captures the click ID (`_fbc`/`_fbp` cookies, set automatically by the Pixel from `fbclid`) and the user's **email**, and fires a **Lead** event carrying BOTH. Later, the in-app Subscribe fires with the same email. Meta joins Lead↔Subscribe on the hashed email — and because the Lead has `fbc`, the whole chain gets attributed to the ad.

**Bonus:** the page *is* the lead-magnet delivery we already built (8-Second Tape / Reader Test / Analyzer). One page fixes attribution, delivers the guide, and grows an owned email list.

```
Ad (fbclid) ──▶ /go landing ──▶ email capture ──▶ Lead event {fbc + hashed email, event_id}
                    │                                         │
                    └──▶ deliver guide + smart App Store btn  │  (Meta stores fbc↔email)
                                     │                        ▼
                              App Store ▶ install ▶ in-app Subscribe {same email}
                                                                  │
                                              Meta joins on email ──▶ ✅ ad gets the credit
```

## 1. The landing page
- **URL:** `https://drselftape.app/go` with per-magnet variants `/go/reader`, `/go/analyzer`, `/go/8second` (each preselects which guide to deliver + which headline). Preserve all query params (`fbclid`, `utm_*`).
- **Where it lives:** a **standalone static page in `public/go/` (plain HTML/CSS/JS)**, NOT a React route — ad traffic bounces on slow first-paint, and a static page loads before the app bundle. Reuse the DST card design system (dark `#080a0f`, coral→purple, Space Grotesk + JetBrains Mono) so it matches the lead magnets.
- **Above the fold:** the guide's hook headline (e.g. "Casting saw 200 tapes today. Yours got 8 seconds.") + one email field + one button ("Get the free guide"). No nav, no scroll needed. Sub-line: "Free — plus your first AI tape review, on us."
- **After submit:** show the guide (inline or link) AND a **smart app button**: iOS → App Store, Android → Play, desktop → a QR + "open on your phone." Keep the guide value-first; the app is the natural next step, not a wall.

## 2. Pixel + event wiring (the attribution core)
- Load the **Meta Pixel base code** (id `388797831681495`) in the page `<head>` → fires `PageView`, and the Pixel auto-derives `_fbc` from the `fbclid` param + sets `_fbp`. (This is the step the App Store funnel skips today.)
- **On email submit**, mint one `event_id` and fire **Lead** twice, deduped:
  1. Browser: `fbq('track','Lead', {}, {eventID})`.
  2. Server: `POST /v1/analytics/track/` with `event:"lead"`, the `event_id`, the email, and the `_fbc`/`_fbp` cookie values + `source_url`. The existing `capi.py` forwards it server-side with the hashed email + IP + UA + **fbc** → Meta dedups browser vs server on `event_id`.
- This mirrors the pattern already in `src/utils/analytics.js` (event_id 4th-arg + track POST) — reuse it.

## 3. Backend changes (small)
- **`apps/analytics/capi.py`:** add `lead → Lead` to the STD event map (or add `lead` to `META_CAPI_EXTRA_EVENTS`). Ensure it reads `fbc`/`fbp` from the request payload (it already passes `_fbp`/`_fbc` per the CAPI build) and hashes the email.
- **Lead storage:** a lightweight `POST /v1/leads/` (or reuse an existing endpoint) that stores `{email, magnet, utm_*, fbclid, created_at}` → your owned list + lets you deliver the guide by email later. Dedup on email. (Optional v1: skip storage, just fire the event + return the guide link.)

### ⚠️ MANDATORY guardrails before the public `/v1/analytics/lead/` endpoint ships (from Codex review 2026-07-11)
It's an **unauthenticated** endpoint → treat it as hostile input:
1. **Throttle** — per-IP burst limit (DRF `AnonRateThrottle`, ~10/min) so nobody floods the pixel dataset.
2. **Validate email** format before calling `send_capi_event` (reject junk).
3. **event_id replay protection** — cache-key each `event_id` (TTL 24h), reject dupes.
4. **No PII in logs** — the `TrackEventView` log scrub is done; the new view must not log raw email either.
5. **Cap `fbc`/`fbp` length** to prevent oversized payloads.

### Already fixed in the `capi.py`/`views.py` diff (Codex pass)
- Identity poisoning closed: payload email can only be used for **anonymous** callers, never to override an authenticated (incl. blank-email Apple) user.
- PII log scrub added to `TrackEventView`.

### Separate pre-existing issue to flag (not this diff)
- `send_capi_event(action_source="website")` is the default, so **in-app** Subscribe/CompleteRegistration events are currently reported to Meta as `website` rather than `app`. Low severity, but it skews channel accuracy — worth a follow-up to pass `action_source="app"` for native-origin events.

## 4. Ad-side changes
- Repoint each ad's **destination URL** from the App Store to the matching `/go/*` page. Keep `fbclid` auto-append on (default) and add `utm_source=meta&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`.
- Keep the App Store link only as the *post-email* button on the landing page.
- Separately (not this spec, but pairs with it): graduate the campaign objective off Traffic/LINK_CLICKS so Meta optimizes for the **Lead** conversion, not cheap clicks.

## 5. Verify it worked
- **Meta Events Manager → Test Events:** load `/go?fbclid=TEST` → confirm PageView + Lead fire with `fbc` present.
- **Dataset quality (the proof):** re-run `ads_get_dataset_quality` on `388797831681495` after real traffic → **`fbc` coverage on Lead should climb from 0% toward the click-through rate**, and Subscribe attribution improves as Lead↔Subscribe email-joins land. That 0%→nonzero on `fbc` is the whole success metric.
- Watch EMQ composite on Lead (aim >6) and confirm Leads show a **"Website" / server** source in EM.

## 6. Scope / effort
- Static landing page (reusing the lead-magnet design): ~half a day.
- BE: `lead→Lead` map + optional `/v1/leads/` endpoint: ~1–2 hrs.
- Ads: repoint URLs + UTMs: ~15 min in Ads Manager.
- **Net: about a day, mostly the page.** Cheapest possible path from "0% attribution" to "we can see which ads convert" — and it doubles as the lead-magnet + email-capture engine.

## Honest limits
- This gives **email-join attribution**, not deterministic click→install. It's a big step up from 0% but not as clean as a web-native funnel. The fully-correct iOS path is still SKAdNetwork + an App Promotion campaign — this bridge is the 80/20 that ships in a day and immediately makes the ad numbers legible.
