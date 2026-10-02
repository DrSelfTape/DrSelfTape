// Library imports
import axios from 'axios';

// Local imports
import axiosInstance from '../redux/http';
import { baseURL } from '../redux/constant';

/**
 * "Ask a friend to read the other character's lines."
 *
 * Two halves with two different trust models, so two different clients:
 *
 *  • The ACTOR's half (mint / list / revoke) is authenticated and goes
 *    through axiosInstance like everything else — it wants the Bearer
 *    header, the device header and the silent-refresh interceptor.
 *
 *  • The FRIEND's half is public and uses BARE axios on purpose. The token
 *    in the URL is the whole credential; sending an Authorization header
 *    to it would be pointless at best, and when the friend happens to also
 *    be a logged-in user it would hand their Bearer to an endpoint that
 *    neither wants nor checks it. Bare axios also keeps the public page out
 *    of the 401 session-expiry machinery: a dead link returns 404, and
 *    nothing about a stranger's page should be able to touch a session.
 *
 * Backend contract: apps/scene_study/reader_invite.py + urls.py.
 * Every response is the house envelope: { data, message, success }.
 */

const SCENE_STUDY = '/v1/scene-study';
const PUBLIC_TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS = 120000;

// The backend caps one multipart POST at 25 clips (MAX_CLIPS_PER_REQUEST).
// Mirrored here so a friend who recorded a 40-line scene gets two requests
// instead of one rejection.
export const MAX_CLIPS_PER_REQUEST = 25;

const unwrap = (res) => res?.data?.data;

/** Thrown for any token the backend will not serve: unknown, expired, revoked.
 *  The backend deliberately returns the SAME 404 for all three so a prober
 *  cannot tell them apart — the page must not pretend to know either. */
export class ReaderInviteUnavailableError extends Error {
  constructor(message) {
    super(message || 'This link is no longer available.');
    this.name = 'ReaderInviteUnavailableError';
    this.unavailable = true;
  }
}

const publicError = (err) => {
  const status = err?.response?.status;
  if (status === 404 || status === 410 || status === 403) {
    return new ReaderInviteUnavailableError(err?.response?.data?.message);
  }
  return err;
};

/* ------------------------------------------------------------------ *
 * The actor's side (authenticated)
 * ------------------------------------------------------------------ */

/**
 * POST /v1/scene-study/reader-invites/
 * body: { scene_id, character, friend_name, note }
 * -> { id, token, url, scene_id, scene_title, character, friend_name,
 *      note, expires_at, revoked, clip_count }
 */
export const createReaderInvite = ({ sceneId, character, friendName = '', note = '' }) =>
  axiosInstance
    .post(`${SCENE_STUDY}/reader-invites/`, {
      scene_id: sceneId,
      character,
      friend_name: friendName,
      note,
    })
    .then(unwrap);

/**
 * GET /v1/scene-study/reader-invites/list/?scene_id=
 * -> [{ id, token, url, scene_id, scene_title, character, friend_name, note,
 *       created_at, expires_at, revoked, expired, open_count,
 *       first_opened_at, clips: [{ id, line_id, audio_url, duration_ms,
 *       received_at }] }]
 */
export const listReaderInvites = (sceneId) =>
  axiosInstance
    .get(`${SCENE_STUDY}/reader-invites/list/`, {
      params: sceneId ? { scene_id: sceneId } : undefined,
    })
    .then((res) => unwrap(res) || []);

/** POST /v1/scene-study/reader-invites/<id>/revoke/ -> { id, revoked: true } */
export const revokeReaderInvite = (inviteId) =>
  axiosInstance.post(`${SCENE_STUDY}/reader-invites/${inviteId}/revoke/`).then(unwrap);

/* ------------------------------------------------------------------ *
 * The friend's side (public, no account)
 * ------------------------------------------------------------------ */

/**
 * GET /v1/scene-study/reader/<token>/
 * -> { actor_first_name, friend_name, note, scene_title, character,
 *      expires_at, max_takes_per_line,
 *      lines: [{ id, character, text, line_type, to_record,
 *                context: { character, text } | null, recorded_count }] }
 */
export const fetchReaderInvite = (token) =>
  axios
    .get(`${baseURL}${SCENE_STUDY}/reader/${encodeURIComponent(token)}/`, {
      timeout: PUBLIC_TIMEOUT_MS,
    })
    .then(unwrap)
    .catch((err) => {
      throw publicError(err);
    });

/**
 * POST /v1/scene-study/reader/<token>/clips/ (multipart)
 *
 * One file per line, keyed `audio_<lineId>`, with `duration_ms_<lineId>`
 * alongside it. Batched to MAX_CLIPS_PER_REQUEST.
 *
 * @param {string} token
 * @param {Array<{ lineId: number, blob: Blob, durationMs?: number }>} clips
 * @param {(fraction: number) => void} [onProgress] 0..1 across all batches
 * @returns {Promise<{ stored: Array, rejected: Array, total_clips: number }>}
 */
export const sendReaderClips = async (token, clips, onProgress) => {
  const url = `${baseURL}${SCENE_STUDY}/reader/${encodeURIComponent(token)}/clips/`;
  const batches = [];
  for (let i = 0; i < clips.length; i += MAX_CLIPS_PER_REQUEST) {
    batches.push(clips.slice(i, i + MAX_CLIPS_PER_REQUEST));
  }

  const stored = [];
  const rejected = [];
  let totalClips = 0;

  for (let b = 0; b < batches.length; b += 1) {
    const form = new FormData();
    batches[b].forEach(({ lineId, blob, durationMs }) => {
      // The extension is cosmetic — the backend reads content_type — but a
      // named file is what makes the upload legible in logs and in R2.
      const ext = (blob?.type || '').includes('webm') ? 'webm' : 'm4a';
      form.append(`audio_${lineId}`, blob, `line-${lineId}.${ext}`);
      if (Number.isFinite(durationMs)) {
        form.append(`duration_ms_${lineId}`, String(Math.round(durationMs)));
      }
    });

    // Sequential on purpose: a phone on a bad connection should not race
    // four uploads, and a later batch must not land before an earlier one.
    const res = await axios
      .post(url, form, {
        timeout: UPLOAD_TIMEOUT_MS,
        onUploadProgress: (e) => {
          if (!onProgress || !e?.total) return;
          const done = b / batches.length;
          onProgress(done + (e.loaded / e.total) / batches.length);
        },
      })
      .catch((err) => {
        throw publicError(err);
      });

    const data = unwrap(res) || {};
    stored.push(...(data.stored || []));
    rejected.push(...(data.rejected || []));
    totalClips = data.total_clips ?? totalClips;
  }

  onProgress?.(1);
  return { stored, rejected, total_clips: totalClips };
};
