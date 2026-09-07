# E-03 · `REVIEW_GATE_STRIP_SCORES` flip readiness — prepare only (2026-09-07)

**Verdict today: NO-GO.** Not because the FE is unready — every read is
guarded (below) — but because nothing measures native adoption yet. This
branch adds the measurement; the flip waits for the data.

## 1. FE audit — every read of per-dimension `scores` on a stripped payload

| Read | Behaviour with `scores` absent | OK? |
|---|---|---|
| `Jericho/index.jsx:186` ReviewDetailSheet `values` → `avg` | `headline_score` is read first; `values` only backs it up; `band` null-safe | ✅ |
| `TapeReview.jsx:701` `rawHasScores` (incomplete-result guard) | any of verdict/working/adjustments/performance/dna keeps the result; a gated free result always has a verdict | ✅ |
| `TapeReview.jsx:750` `heroVals` → gauge | server-first `headline_score`, scores only as fallback | ✅ |
| `TapeReview.jsx:922` share card `shareAvg` | same server-first rule | ✅ |
| `DesktopTapeReport.jsx:39` | filters to present keys; section hidden when none | ✅ |
| `TapeReviewNotes.jsx:47-161` | `hasScores` gate; bars only for present keys | ✅ |
| `recapPages.js` (V-02) | never reads `scores` (band/avg come in as props) | ✅ |
| `compareMatrixData.js:29` | compare `analysis` is already stripped for free users by `review_gate.py` regardless of this flag; `score()` returns null for missing | ✅ |
| `jerichoSlice.js:188` `tapeReviewHasContent` | verdict alone is enough | ✅ |

No change needed on the FE for a stripped payload. Native builds ≤ 1.0.19
predate `headline_score` and DO blank the gauge — that is the population the
query below sizes.

## 2. The measurement (this branch)

`src/utils/analytics.js` now registers PostHog super properties on init:
`app_platform` ('ios' | 'android' | 'web'), `app_version` (MARKETING_VERSION
on native via `@capacitor/app` `getInfo()`, `VITE_APP_VERSION` on web) and
`app_build` (CURRENT_PROJECT_VERSION on native). They ride on every event from
the next TestFlight/App Store build onward; web gets them on deploy.

### The exact PostHog query (HogQL · Data Management → SQL)

Share of iOS sessions over the last 7 days on a build that reads
`headline_score` (build ≥ 142 — the first build carrying this stamp is the
first one we can see at all, so the denominator is "iOS sessions that report
a build"):

```sql
select
  countDistinctIf(properties.$session_id, toInt32OrZero(properties.app_build) >= 142) as sessions_on_target,
  countDistinct(properties.$session_id)                                               as sessions_reporting_build,
  round(100 * sessions_on_target / greatest(sessions_reporting_build, 1), 1)          as pct_on_target
from events
where timestamp > now() - interval 7 day
  and properties.app_platform = 'ios'
  and properties.app_build != ''
```

And the blind spot — iOS sessions that report NO build (older clients, the
ones the flag would blank). This is the number that has to shrink toward zero:

```sql
select
  countDistinctIf(properties.$session_id, properties.app_build = '' or properties.app_build is null) as legacy_sessions,
  countDistinct(properties.$session_id)                                                             as all_ios_sessions
from events
where timestamp > now() - interval 7 day
  and properties.$os = 'iOS'
  and properties.$browser = 'Mobile Safari'   -- WKWebView reports as Safari; web Safari-on-iPhone is folded in, so this is an UPPER bound
```

## 3. Go / no-go rule

GO when, over a full 7-day window after the stamped build is live:
- `pct_on_target ≥ 95%`, and
- `legacy_sessions / all_ios_sessions ≤ 5%` (upper bound — includes mobile-web Safari, which always reads `headline_score`).

Until then: **NO-GO.** Current state: no build reports `app_build` yet →
pct_on_target undefined, legacy share = 100% by construction.

## 4. The flip (when GO)

```
railway variables --set REVIEW_GATE_STRIP_SCORES=true    # BE service, Railway project drselftape-api
```
(or Railway dashboard → api service → Variables). No deploy needed beyond
Railway's restart. Roll back = set `false`. BE tests already cover both states
(`apps/ai/test_recording_review.py`, `test_personal_records.py`).

## 5. Not done / not verified
- No production data exists for these properties until the next native build ships; the numbers above cannot be read today.
- App Store Connect Sales reports carry a per-version units column and could estimate adoption sooner — not wired.
