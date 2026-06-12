import { registerPlugin, Capacitor } from '@capacitor/core';
import axios from '../redux/http';

// Custom native plugin (VoipCallPlugin in ios/App/App/AppDelegate.swift).
// One CXProvider handling: JS-triggered CallKit rings (app alive) + PushKit
// VoIP-push rings (app killed/locked). iOS only.
const VoipCall = registerPlugin('VoipCall');

export const isVoipNative = () => Capacitor.getPlatform() === 'ios';

function sendToken(token) {
  if (!token) return;
  axios.post('/v1/notifications/push/device-token/', { token, platform: 'ios_voip' }).catch(() => {});
}

let registered = false;
/** Register for VoIP pushes and report the token to the backend. Idempotent. */
export async function registerVoip() {
  if (!isVoipNative() || registered) return;
  registered = true;
  try {
    // The token may arrive asynchronously after PushKit registration.
    VoipCall.addListener('voipToken', ({ token }) => sendToken(token));
    const res = await VoipCall.register();
    sendToken(res?.token);
  } catch {
    registered = false; // allow a retry if the plugin wasn't ready
  }
}

export { VoipCall };
