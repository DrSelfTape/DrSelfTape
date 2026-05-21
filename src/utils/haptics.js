// Tiny wrapper around @capacitor/haptics. No-ops gracefully on web
// and when the plugin isn't available (e.g. older iOS). Each helper
// is named after the *moment* in the UX so call sites read like prose:
// `tapSelect()` not `Haptics.impact({ style: 'Light' })`.
//
// The actual Haptics import is dynamic so the plugin code never lands
// in the web bundle.

import { Capacitor } from '@capacitor/core';

const isNative = () => Capacitor.isNativePlatform();

let modulePromise = null;
function load() {
  if (!isNative()) return Promise.resolve(null);
  if (!modulePromise) {
    modulePromise = import('@capacitor/haptics').catch(() => null);
  }
  return modulePromise;
}

async function impact(style) {
  const mod = await load();
  if (!mod) return;
  try {
    await mod.Haptics.impact({ style: mod.ImpactStyle[style] });
  } catch { /* silent */ }
}

async function notif(type) {
  const mod = await load();
  if (!mod) return;
  try {
    await mod.Haptics.notification({ type: mod.NotificationType[type] });
  } catch { /* silent */ }
}

/** Light tap — confirm a selection, toggle a switch, swipe a card. */
export const tapSelect = () => impact('Light');

/** Medium thud — primary button press, "Start", "Record". */
export const tapPrimary = () => impact('Medium');

/** Heavy whack — destructive confirm, "Delete account". */
export const tapHeavy = () => impact('Heavy');

/** Success pattern — match made, scene saved, audition logged. */
export const cheer = () => notif('Success');

/** Warning pattern — wrong password, cooldown lock. */
export const warn = () => notif('Warning');

/** Error pattern — request failed, upload broken. */
export const err = () => notif('Error');
