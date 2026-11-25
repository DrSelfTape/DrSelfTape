/**
 * Refuse to sync a native app whose web bundle has no RevenueCat key.
 *
 * src/utils/purchases.js reads VITE_REVENUECAT_IOS_KEY / _ANDROID_KEY at
 * BUILD time. A dist built without the key for a platform still boots, but
 * every purchase silently becomes "manage on web". That is exactly how the
 * Android build shipped from July to November with no in-app purchases
 * (Sentry: "IAP misconfigured: no RevenueCat key for android").
 *
 * This runs before `cap sync <platform>` and looks for the store's public key
 * prefix inside the built JavaScript itself, so it checks what actually ships,
 * not what the shell happens to have set now. It never prints the key.
 *
 * Usage: node scripts/check-native-keys.mjs <ios|android> [distDir]
 */
import fs from 'node:fs';
import path from 'node:path';

const PLATFORMS = {
  ios: { envVar: 'VITE_REVENUECAT_IOS_KEY', pattern: /\bappl_[A-Za-z0-9]{8,}/ },
  android: { envVar: 'VITE_REVENUECAT_ANDROID_KEY', pattern: /\bgoog_[A-Za-z0-9]{8,}/ },
};

export function bundleHasKey(platform, distDir) {
  const spec = PLATFORMS[platform];
  if (!spec) throw new Error(`Unknown platform "${platform}". Use ios or android.`);
  if (!fs.existsSync(distDir)) return false;
  const stack = [distDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith('.js') && spec.pattern.test(fs.readFileSync(full, 'utf8'))) return true;
    }
  }
  return false;
}

export function checkNativeKey(platform, distDir = 'dist') {
  if (bundleHasKey(platform, distDir)) return;
  const { envVar } = PLATFORMS[platform];
  throw new Error(
    `No RevenueCat ${platform} key in ${distDir}: in-app purchases would be disabled in this build. ` +
    `Set ${envVar} (the public key from the RevenueCat dashboard) in the .env you build from, ` +
    `run \`npm run build\` again, then sync.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [platform, distDir = 'dist'] = process.argv.slice(2);
  try {
    checkNativeKey(platform, distDir);
    console.log(`check-native-keys: ${platform} RevenueCat key present in ${distDir}.`);
  } catch (error) {
    console.error(`check-native-keys: ${error.message}`);
    process.exit(1);
  }
}
