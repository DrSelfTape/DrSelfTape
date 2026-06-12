import { registerPlugin, Capacitor } from '@capacitor/core';

// Native helper (iOS) — restores the shared AVAudioSession to a playback
// config after the native speech recognizer leaves it in `.measurement` mode
// + `.duckOthers`, which otherwise silences the AI reader's WebView TTS.
// See AudioSessionPlugin in ios/App/App/AppDelegate.swift.
const AudioSession = registerPlugin('AudioSession');

/** Reset iOS audio routing to playback. No-op off native iOS. */
export async function resetAudioToPlayback() {
  if (Capacitor.getPlatform() !== 'ios') return;
  try {
    await AudioSession.resetToPlayback();
  } catch {
    /* plugin unavailable (older build / web) — caller still proceeds */
  }
}
