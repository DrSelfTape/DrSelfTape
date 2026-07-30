import { registerPlugin, Capacitor } from '@capacitor/core';
import axios from '../redux/http';

// Custom native plugin (VoipCallPlugin in ios/App/App/AppDelegate.swift).
// One CXProvider handling: JS-triggered CallKit rings (app alive) + PushKit
// VoIP-push rings (app killed/locked). iOS only.
const VoipCall = registerPlugin('VoipCall');

export const isVoipNative = () => Capacitor.getPlatform() === 'ios';

let tokenAcked = false; // the BE has confirmed receipt of the VoIP token

// Report the VoIP token to the BE, retrying on failure. The first attempt can
// fail because auth isn't ready yet or the device is briefly offline — and if
// it's dropped silently the BE never learns the token and the device can never
// be VoIP-rung. So back off and retry; leave tokenAcked false so a later
// registerVoip() (next app launch / socket reconnect) tries again too.
async function sendToken(token, attempt = 0) {
  if (!token || tokenAcked) return;
  try {
    await axios.post('/v1/notifications/push/device-token/', { token, platform: 'ios_voip' });
    tokenAcked = true;
  } catch {
    if (attempt < 4) {
      const delay = 1000 * 2 ** attempt; // 1s, 2s, 4s, 8s
      setTimeout(() => { sendToken(token, attempt + 1); }, delay);
    }
  }
}

let listenerAttached = false;
/** Register for VoIP pushes and report the token to the backend. Idempotent;
 *  safe (and useful) to call again — it re-attempts an unacked token. */
export async function registerVoip() {
  if (!isVoipNative()) return;
  try {
    // The token may arrive asynchronously after PushKit registration, so keep
    // the listener attached across calls (attach once).
    if (!listenerAttached) {
      // Must await: Capacitor's plugin proxy resolves the implementation
      // asynchronously, so an unimplemented plugin surfaces as a REJECTED
      // PROMISE, not a sync throw — un-awaited, it escapes this try/catch
      // as an unhandledrejection (the "$exception: VoipCall plugin is not
      // implemented" events in PostHog).
      await VoipCall.addListener('voipToken', ({ token }) => sendToken(token));
      listenerAttached = true;
    }
    const res = await VoipCall.register();
    await sendToken(res?.token);
  } catch {
    listenerAttached = false; // plugin wasn't ready — allow a full retry
  }
}

export { VoipCall };
