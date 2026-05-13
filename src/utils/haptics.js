import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Haptics fire only inside a native Capacitor build (iOS / Android).
// On web every call is a safe no-op so the same call sites work everywhere.
const isNative = Capacitor.isNativePlatform();

const safe = (fn) => isNative ? fn().catch(() => {}) : Promise.resolve();

export const haptic = {
  light:    () => safe(() => Haptics.impact({ style: ImpactStyle.Light })),
  medium:   () => safe(() => Haptics.impact({ style: ImpactStyle.Medium })),
  heavy:    () => safe(() => Haptics.impact({ style: ImpactStyle.Heavy })),
  success:  () => safe(() => Haptics.notification({ type: NotificationType.Success })),
  warning:  () => safe(() => Haptics.notification({ type: NotificationType.Warning })),
  error:    () => safe(() => Haptics.notification({ type: NotificationType.Error })),
  select:   () => safe(() => Haptics.selectionChanged()),
};
