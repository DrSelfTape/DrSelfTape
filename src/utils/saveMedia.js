// Cross-platform "save this blob" helper.
//
// On WEB: trigger a normal browser download (<a download>).
// On NATIVE (iOS + Android): the Android System WebView IGNORES the
// `download` attribute (the bare Capacitor BridgeActivity wires no
// DownloadListener), so <a download> silently no-ops — recorded self-tapes
// could never be saved on Android. Instead we write the blob to the app
// cache via @capacitor/filesystem and open the native share sheet
// (@capacitor/share) so the user can save to Photos / Files / Drive.
//
// Returns { ok, method } or { ok:false, error } so callers can surface a
// real message instead of a silent failure.

import { Capacitor } from '@capacitor/core';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // strip the "data:<mime>;base64," prefix — Filesystem wants raw base64
      const result = String(reader.result || '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Save/export a Blob. `filename` should include an extension.
 * Web → download. Native → write to cache + native share sheet.
 */
export async function saveBlob(blob, filename) {
  if (!blob) return { ok: false, error: 'no_blob' };

  if (!Capacitor.isNativePlatform()) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { ok: true, method: 'download' };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  }

  // Native: Filesystem write to Cache, then Share.
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: filename,
      url: written.uri,
      dialogTitle: 'Save your take',
    });
    return { ok: true, method: 'share' };
  } catch (e) {
    // User cancelling the share sheet rejects on some platforms — treat as ok-ish.
    const msg = String(e?.message || e);
    if (/cancel/i.test(msg)) return { ok: true, method: 'share', cancelled: true };
    return { ok: false, error: msg };
  }
}

/**
 * Convenience: resolve a blob: URL back to a Blob, then saveBlob().
 * Recorders hold an object URL (from URL.createObjectURL); this re-fetches it.
 */
export async function saveBlobUrl(blobUrl, filename) {
  if (!blobUrl) return { ok: false, error: 'no_url' };
  try {
    const blob = await (await fetch(blobUrl)).blob();
    return saveBlob(blob, filename);
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
