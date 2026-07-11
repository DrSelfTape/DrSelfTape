/**
 * Jericho — Self-Evolving AI Coach
 * Redux slice for actor memory, session logs, insights, and evolution metrics.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import rawAxios from 'axios';
import axios from '../../http';
import endPoints from '../../constant';
import { trackEvent, Events } from '../../../utils/analytics';

// Map an AI-feature request error to a clear, actionable message. 402 = out of
// tokens, 403 = AI consent not granted, 400 = the file(s) couldn't be read.
function aiErrorMessage(err, fallback) {
  // Aborted (user left the screen mid-analysis) — not a real error.
  if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.aborted) {
    return 'Analysis cancelled.';
  }
  const st = err?.response?.status;
  const msg = err?.response?.data?.message || err?.response?.data?.detail;
  if (st === 402) return "You're out of AI tokens — top up to keep going.";
  if (st === 403) return 'Turn on AI features in Settings to use this.';
  if (st === 413) return 'That file is too large — try a shorter / smaller export.';
  if (st === 400) return msg || "Those files couldn't be read — try exporting as mp4 or mov.";
  if (st === 504) return msg || 'That took too long — please try again.';
  return msg || fallback;
}

const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Persistence helpers ─────────────────────────────────────────────────────
// Keep the key as a module constant so both the save and resume paths agree on
// the exact string without needing to export it.
const PENDING_JOB_KEY = 'dst_pending_analysis';

// Persist a running job so it can be resumed after a page reload or app
// restart. The slot holds the minimal info needed to re-attach: jobId + kind
// + startedAt for the 30-minute TTL check in TapeReview. Wrapped in try/catch
// — localStorage can throw in private/incognito mode.
function savePendingJob(jobId, kind) {
  try {
    localStorage.setItem(PENDING_JOB_KEY, JSON.stringify({ jobId, kind, startedAt: Date.now() }));
  } catch { /* private mode */ }
}

// Called once the job resolves (success OR failure OR poll timeout) so the
// slot doesn't linger and the next mount skips a stale resume attempt.
function clearPendingJob() {
  try { localStorage.removeItem(PENDING_JOB_KEY); } catch { /* private mode */ }
}

// When the BE runs the analysis off the request thread (AI_ASYNC_ANALYSIS), the
// POST returns {job_id, status:'pending'} instead of the result. Poll the job
// until it's done/failed. Throws an axios-shaped error so aiErrorMessage handles
// it identically to the synchronous path.
async function pollAnalysisJob(jobId, { interval = 2500, timeoutMs = 180000, signal } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    // Bail the moment the caller (e.g. the screen unmounting) aborts.
    if (signal?.aborted) throw { name: 'CanceledError', code: 'ERR_CANCELED', aborted: true };
    await _sleep(interval);
    if (signal?.aborted) throw { name: 'CanceledError', code: 'ERR_CANCELED', aborted: true };
    const { data } = await axios.get(`${endPoints.analysisJob}${jobId}/`, { signal });
    const j = data?.data || data;
    if (j?.status === 'done') return j.result;
    if (j?.status === 'failed') {
      throw { response: { status: 502, data: { message: j.error || 'Analysis failed — please try again.' } } };
    }
  }
  // Poll TIMEOUT (not a BE failure): the job may still finish, so the outcome is
  // UNKNOWN. Flag it so the idempotency key is KEPT — a retry must dedup against
  // the possibly-still-running job rather than start a duplicate paid analysis.
  throw { response: { status: 504, data: { message: 'Analysis took too long — please try again.' } }, unknownOutcome: true };
}

// Keep the idempotency key ONLY when the outcome is genuinely unknown — a true
// network/timeout/abort (no response) or an async poll that timed out on a job
// that may still complete. A real server response (4xx/5xx from the request, or
// a job the BE marked 'failed') means the BE already refunded, so a retry must
// RE-CHARGE → the component rotates the key.
function shouldReuseKey(err) {
  return err?.response == null || err?.unknownOutcome === true;
}

// A tape-review / compare response is either the synchronous result or a pending
// job to poll. Normalizes both to the final result. When the response is async,
// persists the job to localStorage (so TapeReview can resume after a reload)
// and clears the slot in a finally block — the clear is guaranteed regardless
// of whether the poll succeeds, fails, or times out.
async function resolveAnalysis(payload, { signal, kind } = {}) {
  if (payload && payload.job_id && payload.status === 'pending') {
    savePendingJob(payload.job_id, kind);
    try {
      return await pollAnalysisJob(payload.job_id, { signal });
    } finally {
      clearPendingJob();
    }
  }
  return payload;
}

// ─── Shared result reducers ──────────────────────────────────────────────────
// Extracted so resumeAnalysisJob can delegate to the same logic as the
// originating thunks instead of duplicating it.
function applyReviewResult(state, result) {
  state.tapeReviewResult = result;
  // Kind-tagged (truthy) so the Review tab lands in the matching mode
  // when the user returns via the notes-ready dot — a plain boolean
  // sent compare results back to single mode, where they were
  // unreachable (codex review catch).
  state.notesReady = 'review';
  // A token was just spent — nudge useTokenBalance past its cache so
  // every surface shows the post-charge number (codex review catch:
  // the recorder path showed the pre-charge balance until an
  // unrelated refresh).
  try { window.dispatchEvent(new Event('dst-tokens-changed')); } catch { /* SSR/noop */ }
}

function applyCompareResult(state, result) {
  state.compareResult = result;
  state.notesReady = 'compare';
  try { window.dispatchEvent(new Event('dst-tokens-changed')); } catch { /* SSR/noop */ }
}

// Defense in depth (BUG 3): the BE can return 200 with an empty/near-empty body
// after charging a token (the BE refunds on its side). Without this guard the
// thunk fulfills truthy and the result screen renders a wall of zeroed scores.
// Treat a result with NONE of the real content fields as an incomplete analysis
// and force the clean error path.
function tapeReviewHasContent(r) {
  if (!r || typeof r !== 'object') return false;
  const verdict = !!r.verdict;
  const working = Array.isArray(r.whats_working) && r.whats_working.length > 0;
  const adjustments = Array.isArray(r.adjustments) && r.adjustments.length > 0;
  const performance = !!(r.performance && Object.values(r.performance).some(Boolean));
  const scores = !!(r.scores && Object.values(r.scores).some((v) => v != null));
  const dna = !!(r.performance_dna && Object.values(r.performance_dna).some((v) => v != null));
  return verdict || working || adjustments || performance || scores || dna;
}

// ─── Thunks ────────────────────────────────────────────────────────────

/** Fetch the actor's AI memory profile */
export const fetchActorMemory = createAsyncThunk(
  'jericho/fetchActorMemory',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(endPoints.actorMemory);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch actor memory');
    }
  }
);

/** Update the actor's AI memory profile (partial) */
export const updateActorMemory = createAsyncThunk(
  'jericho/updateActorMemory',
  async (updates, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(endPoints.actorMemory, updates);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update actor memory');
    }
  }
);

/** Log a completed AI session */
export const logSession = createAsyncThunk(
  'jericho/logSession',
  async (sessionData, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.sessionLog, sessionData);
      return data?.data || data;
    } catch (err) {
      // Silently fail — session logging should never break the main flow
      console.warn('[Jericho] Session log failed:', err.message);
      return rejectWithValue(err.response?.data?.message || 'Failed to log session');
    }
  }
);

/** Update a session log with post-session feedback (mood, rating, notes) */
export const updateSessionLog = createAsyncThunk(
  'jericho/updateSessionLog',
  async ({ sessionId, ...updates }, { rejectWithValue }) => {
    try {
      const { data } = await axios.patch(`${endPoints.sessionLog}${sessionId}/`, updates);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update session');
    }
  }
);

/** Fetch coaching insights */
export const fetchInsights = createAsyncThunk(
  'jericho/fetchInsights',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${endPoints.aiInsights}?${query}` : endPoints.aiInsights;
      const { data } = await axios.get(url);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch insights');
    }
  }
);

/** Fetch evolution metrics (improvement over time) */
export const fetchEvolution = createAsyncThunk(
  'jericho/fetchEvolution',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      const url = query ? `${endPoints.aiEvolution}?${query}` : endPoints.aiEvolution;
      const { data } = await axios.get(url);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch evolution data');
    }
  }
);

/** Call Jericho's enriched coaching endpoint (replaces raw cd-feedback) */
export const jerichoCoach = createAsyncThunk(
  'jericho/coach',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(endPoints.jerichoCoach, payload);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Coaching request failed');
    }
  }
);

/** Submit a self-tape for AI review (multipart upload → structured notes) */
// Upload-failure telemetry → Sentry, so we can tell a slow-uplink timeout from a
// WKWebView large-body failure (Stage-1 diagnostics for the big-tape upload
// bug). Best-effort; never throws into the thunk's catch.
async function captureUploadFailure(feature, err, startedAt, loaded, total, timeoutMs) {
  try {
    const Sentry = await import('@sentry/react');
    const elapsedMs = Date.now() - startedAt;
    Sentry.captureException(err, {
      tags: { feature },
      extra: {
        code: err?.code, name: err?.name, message: err?.message,
        status: err?.response?.status,
        online: typeof navigator !== 'undefined' ? navigator.onLine : null,
        elapsedMs, uploadedBytes: loaded, totalBytes: total,
        uploadPercent: total ? Math.round((loaded / total) * 100) : null,
        rateMbps: elapsedMs ? +(((loaded * 8) / 1e6) / (elapsedMs / 1000)).toFixed(2) : null,
        timeoutMs,
      },
    });
  } catch { /* sentry unavailable — don't break the catch path */ }
}

export const reviewTape = createAsyncThunk(
  'jericho/reviewTape',
  async ({ video, sides = '', role = '', tone = '', idempotencyKey = '' }, { rejectWithValue, signal, dispatch }) => {
    const startedAt = Date.now();
    let lastLoaded = 0, lastTotal = 0;
    const onUploadProgress = (e) => {
      lastLoaded = e.loaded || 0; lastTotal = e.total || 0;
      if (e.total) dispatch(setUploadProgress(Math.min(100, Math.round((e.loaded / e.total) * 100))));
    };
    try {
      dispatch(setUploadProgress(0));

      // ── Stage 2: direct-to-R2 upload ──────────────────────────────────────
      // Push the (often 100MB+) video STRAIGHT to Cloudflare R2 via a presigned
      // PUT, bypassing the Django app + Railway edge entirely. The old path
      // streamed the whole body THROUGH the app server, which timed out / got
      // cut on large tapes (the server only ever logged the CORS preflight).
      // Then hand the BE just the R2 key to analyze. If presign or the R2 PUT
      // fails for any reason, fall back to the direct multipart upload below so
      // this can never be a hard regression.
      let r2Key = null;
      try {
        const contentType = video?.type || 'application/octet-stream';
        const { data: presign } = await axios.post(endPoints.jerichoTapeReviewPresign, {
          filename: video?.name || 'tape.mov',
          content_type: contentType,
        }, { signal });
        const info = presign?.data || presign || {};
        if (info.upload_url && info.key) {
          // Raw axios (no API interceptors / auth headers) — extra headers can
          // break the presigned signature. PUT with the exact signed Content-Type.
          await rawAxios.put(info.upload_url, video, {
            headers: { 'Content-Type': info.content_type || contentType },
            timeout: 900000,
            onUploadProgress,
            signal,
          });
          r2Key = info.key;
        }
      } catch {
        r2Key = null; // presign / R2 PUT failed → fall back to direct upload
      }

      let data;
      if (r2Key) {
        // Small request: the BE pulls the already-uploaded object from R2.
        const fd = new FormData();
        fd.append('r2_key', r2Key);
        if (sides) fd.append('sides', sides);
        if (role) fd.append('role', role);
        if (tone) fd.append('tone', tone);
        dispatch(setUploadProgress(100));
        ({ data } = await axios.post(endPoints.jerichoTapeReview, fd, {
          // Stable per-action key → a retried submit dedupes on the BE instead
          // of double-charging a token (F2).
          headers: { ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
          timeout: 900000,
          signal,
        }));
      } else {
        // Fallback: direct multipart upload through the app server (the body
        // streams through Django). Do NOT set Content-Type — the browser must
        // set multipart/form-data WITH the boundary for a FormData body.
        const fd = new FormData();
        fd.append('video', video);
        if (sides) fd.append('sides', sides);
        if (role) fd.append('role', role);
        if (tone) fd.append('tone', tone);
        ({ data } = await axios.post(endPoints.jerichoTapeReview, fd, {
          headers: { ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
          timeout: 900000,
          onUploadProgress,
          signal,
        }));
      }

      const result = await resolveAnalysis(data?.data || data, { signal, kind: 'review' });
      // An empty/partial body charges a token but has nothing to show — take the
      // clean error path instead of fulfilling a hollow result (BUG 3).
      if (!tapeReviewHasContent(result)) {
        // Definitive server result (a 200 the BE refunds via its sanity gate) —
        // rotate the key so a retry re-charges instead of dedup-passing into a
        // free re-analysis. (This branch is currently unreachable: the BE gate
        // turns a thin result into a refunded error before a 200 reaches here.)
        return rejectWithValue({ message: 'This review came back incomplete — your token was refunded. Please try again.', reuseKey: false });
      }
      trackEvent(Events.TAPE_REVIEW, { has_sides: !!sides, has_role: !!role, via: r2Key ? 'r2' : 'direct' });
      return result;
    } catch (err) {
      captureUploadFailure('tape_review_upload', err, startedAt, lastLoaded, lastTotal, 900000);
      return rejectWithValue({ message: aiErrorMessage(err, 'Tape review failed'), reuseKey: shouldReuseKey(err) });
    }
  }
);

/** Compare 2-4 takes of the same audition → ranked winner + why */
export const compareTakes = createAsyncThunk(
  'jericho/compareTakes',
  async ({ takes = [], sides = '', role = '', tone = '', idempotencyKey = '' }, { rejectWithValue, signal, dispatch }) => {
    const startedAt = Date.now();
    let lastLoaded = 0, lastTotal = 0;
    try {
      const fd = new FormData();
      takes.forEach((t) => fd.append('takes', t));
      if (sides) fd.append('sides', sides);
      if (role) fd.append('role', role);
      if (tone) fd.append('tone', tone);
      dispatch(setUploadProgress(0));
      const { data } = await axios.post(endPoints.jerichoCompareTakes, fd, {
        // Do NOT set Content-Type — let the browser set the multipart boundary.
        headers: {
          // Stable per-action key → BE derives one key per take and dedupes a
          // retried submit instead of double-charging the N take tokens (F2).
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        // N takes (100MB+ each) uploaded together can take several minutes on a
        // mobile uplink — the old 180s timeout aborted the transfer client-side.
        // 15 min headroom; Stage-2 fix is direct-to-R2 upload.
        timeout: 900000,
        onUploadProgress: (e) => {
          lastLoaded = e.loaded || 0; lastTotal = e.total || 0;
          if (e.total) dispatch(setUploadProgress(Math.min(100, Math.round((e.loaded / e.total) * 100))));
        },
        signal,
      });
      const result = await resolveAnalysis(data?.data || data, { signal, kind: 'compare' });
      trackEvent(Events.COMPARE_TAKES, { count: takes.length });
      return result;
    } catch (err) {
      captureUploadFailure('compare_takes_upload', err, startedAt, lastLoaded, lastTotal, 900000);
      return rejectWithValue({ message: aiErrorMessage(err, 'Take comparison failed'), reuseKey: shouldReuseKey(err) });
    }
  }
);

/** Re-attach to a job that was started in a previous session (page reload /
 *  app restart). Polls the same endpoint as a normal job, then dispatches into
 *  the same result/notesReady/token-event path via the shared reducer helpers.
 *  Clears the localStorage slot in a finally block so it's gone regardless of
 *  whether the poll succeeds, errors, or is canceled. */
export const resumeAnalysisJob = createAsyncThunk(
  'jericho/resumeAnalysisJob',
  async ({ jobId, kind }, { rejectWithValue, signal }) => {
    try {
      const result = await pollAnalysisJob(jobId, { signal });
      return { result, kind };
    } catch (err) {
      // 404 = job expired/not found on the BE; canceled = user navigated away.
      // Both are "silent" — no error banner, just clear and move on.
      if (
        err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.aborted ||
        err?.response?.status === 404
      ) {
        return rejectWithValue({ kind, silent: true });
      }
      return rejectWithValue({ kind, message: aiErrorMessage(err, 'Resume failed') });
    } finally {
      clearPendingJob();
    }
  }
);

/** Fetch recent session history */
export const fetchRecentSessions = createAsyncThunk(
  'jericho/fetchRecentSessions',
  async (limit = 20, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${endPoints.sessionLog}?limit=${limit}`);
      return data?.data || data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch sessions');
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────

const jerichoSlice = createSlice({
  name: 'jericho',
  initialState: {
    // Actor's AI memory profile
    memory: null,
    memoryLoading: false,
    // True once the first fetch has settled (fulfilled OR rejected).
    // The dashboard needs this to distinguish "still loading" from
    // "fetch failed → keep memory=null" so it doesn't flash the empty
    // state on first paint or on a 401/403/network error.
    memoryHasFetched: false,
    memoryError: null,

    // Coaching insights derived from sessions
    insights: [],
    insightsLoading: false,

    // Evolution metrics over time
    evolution: [],
    evolutionLoading: false,

    // Recent session history
    recentSessions: [],
    sessionsLoading: false,

    // Active coaching state
    coachingLoading: false,
    lastCoachingResult: null,

    // Tape Review — submit a self-tape, get structured acting notes
    tapeReviewLoading: false,
    tapeReviewResult: null,
    tapeReviewError: null,
    compareLoading: false,
    compareResult: null,
    compareError: null,
    // 0-100 upload progress for the tape/compare multipart POST. A large tape
    // can take minutes to upload on mobile, so the loading UI shows this instead
    // of looking frozen.
    uploadProgress: 0,
    // Return cue: a review/compare finished (possibly while the user was on
    // another tab). The mobile tab bar shows a "notes ready" dot on the Review
    // tab while this is set; visiting the tab clears it.
    notesReady: false,

    // Last logged session ID (for attaching post-session feedback)
    lastSessionLogId: null,

    error: null,
  },
  reducers: {
    clearJerichoError: (state) => {
      state.error = null;
    },
    /** Optimistically append a session to recent list */
    appendLocalSession: (state, action) => {
      state.recentSessions.unshift(action.payload);
      if (state.recentSessions.length > 20) state.recentSessions.pop();
    },
    setLastSessionLogId: (state, action) => {
      state.lastSessionLogId = action.payload;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    /** Reset the tape-review result (e.g. to analyze another take) */
    clearTapeReview: (state) => {
      state.tapeReviewResult = null;
      state.tapeReviewError = null;
    },
    clearCompare: (state) => {
      state.compareResult = null;
      state.compareError = null;
    },
    /** Review-tab visit acknowledges the finished notes — dot comes off. */
    clearNotesReady: (state) => {
      state.notesReady = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Actor Memory ──
      .addCase(fetchActorMemory.pending, (state) => {
        state.memoryLoading = true;
        state.memoryError = null;
      })
      .addCase(fetchActorMemory.fulfilled, (state, action) => {
        state.memoryLoading = false;
        state.memoryHasFetched = true;
        state.memoryError = null;
        state.memory = action.payload;
      })
      .addCase(fetchActorMemory.rejected, (state, action) => {
        state.memoryLoading = false;
        state.memoryHasFetched = true;
        state.memoryError = action.payload || 'Failed to load profile';
      })

      .addCase(updateActorMemory.fulfilled, (state, action) => {
        state.memory = { ...state.memory, ...action.payload };
      })

      // ── Session Logging ──
      .addCase(logSession.fulfilled, (state, action) => {
        state.lastSessionLogId = action.payload?.id || null;
        if (action.payload) {
          state.recentSessions.unshift(action.payload);
          if (state.recentSessions.length > 20) state.recentSessions.pop();
        }
        // Update memory session count locally
        if (state.memory) {
          state.memory.total_sessions = (state.memory.total_sessions || 0) + 1;
          state.memory.last_session_at = new Date().toISOString();
        }
      })

      .addCase(updateSessionLog.fulfilled, (state, action) => {
        if (action.payload?.id) {
          const idx = state.recentSessions.findIndex((s) => s.id === action.payload.id);
          if (idx !== -1) state.recentSessions[idx] = action.payload;
        }
      })

      // ── Insights ──
      .addCase(fetchInsights.pending, (state) => { state.insightsLoading = true; })
      .addCase(fetchInsights.fulfilled, (state, action) => {
        state.insightsLoading = false;
        state.insights = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchInsights.rejected, (state) => { state.insightsLoading = false; })

      // ── Evolution ──
      .addCase(fetchEvolution.pending, (state) => { state.evolutionLoading = true; })
      .addCase(fetchEvolution.fulfilled, (state, action) => {
        state.evolutionLoading = false;
        state.evolution = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchEvolution.rejected, (state) => { state.evolutionLoading = false; })

      // ── Jericho Coach ──
      .addCase(jerichoCoach.pending, (state) => { state.coachingLoading = true; })
      .addCase(jerichoCoach.fulfilled, (state, action) => {
        state.coachingLoading = false;
        state.lastCoachingResult = action.payload;
      })
      .addCase(jerichoCoach.rejected, (state, action) => {
        state.coachingLoading = false;
        state.error = action.payload;
      })

      // ── Tape Review ──
      .addCase(reviewTape.pending, (state) => {
        state.tapeReviewLoading = true;
        state.tapeReviewError = null;
        state.uploadProgress = 0;
      })
      .addCase(reviewTape.fulfilled, (state, action) => {
        state.tapeReviewLoading = false;
        state.uploadProgress = 0;
        applyReviewResult(state, action.payload);
      })
      .addCase(reviewTape.rejected, (state, action) => {
        state.tapeReviewLoading = false;
        state.tapeReviewError = action.payload?.message || action.payload || 'Tape review failed';
        state.uploadProgress = 0;
      })
      .addCase(compareTakes.pending, (state) => {
        state.compareLoading = true;
        state.compareError = null;
        state.uploadProgress = 0;
      })
      .addCase(compareTakes.fulfilled, (state, action) => {
        state.compareLoading = false;
        state.uploadProgress = 0;
        applyCompareResult(state, action.payload);
      })
      .addCase(compareTakes.rejected, (state, action) => {
        state.compareLoading = false;
        state.compareError = action.payload?.message || action.payload || 'Take comparison failed';
        state.uploadProgress = 0;
      })

      // ── Resume (page-reload / app-restart recovery) ──
      .addCase(resumeAnalysisJob.pending, (state) => {
        // Use tapeReviewLoading for the staged-progress UI in TapeReview
        // for both review and compare resumes — it's always TapeReview that
        // initiates the resume, and uploadProgress = 100 skips the upload
        // stage so the UI enters at "Watching your performance".
        state.tapeReviewLoading = true;
        state.tapeReviewError = null;
        state.uploadProgress = 100;
      })
      .addCase(resumeAnalysisJob.fulfilled, (state, action) => {
        const { result, kind } = action.payload;
        state.tapeReviewLoading = false;
        state.uploadProgress = 0;
        if (kind === 'compare') {
          applyCompareResult(state, result);
        } else {
          applyReviewResult(state, result);
        }
      })
      .addCase(resumeAnalysisJob.rejected, (state, action) => {
        state.tapeReviewLoading = false;
        state.uploadProgress = 0;
        const { silent, message } = action.payload || {};
        // silent = 404/expired or user canceled — clear the UI, no error banner
        if (!silent) state.tapeReviewError = message || 'Resume failed';
      })

      // ── Recent Sessions ──
      .addCase(fetchRecentSessions.pending, (state) => { state.sessionsLoading = true; })
      .addCase(fetchRecentSessions.fulfilled, (state, action) => {
        state.sessionsLoading = false;
        state.recentSessions = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchRecentSessions.rejected, (state) => { state.sessionsLoading = false; });
  },
});

export const { clearJerichoError, appendLocalSession, setLastSessionLogId, setUploadProgress, clearTapeReview, clearCompare, clearNotesReady } = jerichoSlice.actions;
export default jerichoSlice.reducer;
