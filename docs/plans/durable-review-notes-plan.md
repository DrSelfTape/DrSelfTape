# Durable Review Notes — Implementation Plan

## Problem

A Tape Review costs the user a token and takes 1–3 minutes. Today the result is
ephemeral in two ways:

1. **History rows are dead.** The Jericho "My Growth" panel lists past review
   sessions with a ChevronRight affordance, but rows have no onClick — the BE
   stores full notes in `SessionLog.ai_feedback` and exposes
   `GET /v1/ai/session-log/<id>/` (verified: `apps/ai/urls.py` line 27,
   `SessionLogView`), which no FE surface ever calls.
2. **A killed app loses an in-flight job.** The async analysis job id lives only
   in Redux memory (`pollAnalysisJob` in `src/redux/features/jericho/jerichoSlice.js`).
   If iOS kills the app mid-analysis, the finished notes exist in the DB but the
   user sees nothing — "the feature ate my token."

Also bundled: one queued copy papercut on the same screen.

## Global Constraints (binding for every task)

- **iOS Capacitor gotchas:** any new tappable element uses the tap-belt
  (`onTouchEnd` with `e.preventDefault()` + `touchAction: 'manipulation'` +
  `WebkitTapHighlightColor: 'transparent'` + `type="button"`). Any new
  modal/sheet calls `useHideMobileHeader(true)`. Never use react-router
  `navigate()` for mobile navigation.
- **Zero new lint problems** vs the branch base in every touched file
  (pre-existing problems stay; compare counts before/after).
- `npm run build` must pass after each task.
- **No backend changes.** The BE endpoints used already exist.
- **Do not alter the free-first-review flow semantics** (`firstReview` prop,
  `dst_first_review` handoff, `skipFirstReview`) beyond what a task explicitly
  specifies.
- Match the style of the file you are editing (this codebase mixes idioms;
  mirror the surrounding code, including its comment density).
- Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## Task 1 — Tappable review history with a detail sheet

**File:** `src/panels/Dashboard/Jericho/index.jsx` (only this file).

The review-history list (rows rendered with a `ChevronRight` around line
~560–600; locate by content) currently has no row onClick. Implement:

1. Tapping a history row opens a **detail sheet** (full-screen overlay or
   bottom sheet matching the panel's existing dark Aurora styling) that fetches
   `GET /v1/ai/session-log/<SESSION_ID>/` via the app's shared axios instance
   (`src/redux/http.js` default export pattern — check how this file or
   siblings import it) and renders the stored notes.
2. The response contains the session row; the notes live in the
   `ai_feedback` field (a dict — for tape reviews it has keys like `verdict`,
   `scores` {framing, eyeline, lighting, energy_commitment, dynamic_range},
   `performance` {emotional_arc, strongest_beat, choices, listening_presence,
   truth_vs_indicated}, `the_one_thing`, `tone_tags`). Render, in order:
   verdict (headline treatment) → scores as labeled 1–10 bars → performance
   sections with readable labels → "The one thing" highlighted → tone tags as
   chips. **Every key is optional** — older sessions and live_scene sessions
   have different shapes (e.g. `conversation_history` only). If `ai_feedback`
   has none of the tape-review keys, render the raw fields that DO exist in a
   simple labeled list; never a blank sheet, never a crash.
3. Loading state (spinner or skeleton consistent with the panel) and an error
   state with a retry button.
4. The sheet has a close (X) button; both the row and the X use the tap-belt;
   the sheet calls `useHideMobileHeader(true)` (import path used elsewhere:
   grep for it).
5. Only sessions whose type is a review (`self_tape_review`) get the tap →
   sheet; other session types keep their current non-tappable rendering.

**Tests/verification:** `npm run build` passes; eslint on the file shows no
new problems vs base; describe manual verification steps in your report.

## Task 2 — Resumable in-flight analysis job

**Files:** `src/redux/features/jericho/jerichoSlice.js` and
`src/panels/Dashboard/Jericho/TapeReview.jsx` (only these two).

Today `reviewTape`/`compareTakes` receive `{job_id, status:'pending'}` and poll
in memory (`pollAnalysisJob`). Implement persistence + resume:

1. When a thunk receives a `job_id`, persist
   `{jobId, kind: 'review'|'compare', startedAt: Date.now()}` to
   `localStorage` under key `dst_pending_analysis` (single slot — a new job
   overwrites). Wrap all storage access in try/catch (private mode) as the
   codebase does elsewhere.
2. Clear the slot when the job resolves (fulfilled OR rejected OR poll
   timeout) — the clear must live in a code path shared by success and
   failure, not duplicated per branch where avoidable.
3. Add a `resumeAnalysisJob` thunk: given `{jobId, kind}`, poll the existing
   job endpoint (reuse `pollAnalysisJob`) and dispatch into the SAME
   fulfilled/rejected handling as a fresh job of that kind (result lands in
   `tapeReviewResult`/`compareResult`, sets `notesReady` to the right kind,
   fires the existing `dst-tokens-changed` event path — i.e., reuse the
   existing reducers rather than duplicating their logic; extraReducers for
   the new thunk may delegate to shared reducer functions if needed).
4. On TapeReview mount: if there is no in-flight or completed result in Redux
   AND `dst_pending_analysis` exists AND `startedAt` is less than 30 minutes
   old → dispatch `resumeAnalysisJob` and show the existing staged-progress UI
   (skip the "Uploading" stage — resume enters at "Watching your
   performance"). If the stored job returns 404/expired → clear the slot
   silently (no error banner). If it's older than 30 minutes → clear silently.
5. A resumed compare job must land the user in compare mode (the mode
   initializer already honors `notesReady === 'compare'`; verify resume sets
   state before/compatibly with mount-order, and fix the initializer read if
   resume arrives after mount).

**Tests/verification:** build + no new lint problems; in your report, walk the
four paths (resume-success, resume-404, stale-slot, no-slot) explaining how
each behaves, citing the code you wrote.

## Task 3 — Honest free-review cost line

**File:** `src/panels/Dashboard/Jericho/TapeReview.jsx` (only this file).

Under the "Get my notes" button the caption reads
"Uses 1 token · your tape is analyzed, not stored for training". For users
whose free first review is UNCLAIMED, show instead:
"Your first review is free · your tape is analyzed, not stored for training".

- "Unclaimed" = the same condition Home uses for the free-review hero:
  the `firstReview` prop is true OR the server-synced
  `tutorial_progress.first_review` flag is falsy (find how Home/MobileApp
  reads it — likely via the userSettings/TutorialChecklist mechanism — and
  read the SAME source; do not invent a new flag).
- Compare-takes mode keeps its existing caption unconditionally (compare is
  never free).

**Tests/verification:** build + no new lint problems; report states the exact
condition used and both rendered strings.
