/**
 * Strip web-only downloads out of the NATIVE app bundles after `cap sync`.
 *
 * `vite.config.js` has a `strip-bundle-cruft` plugin that removes `.DS_Store`
 * from `dist`, and it deliberately does NOT remove `*.zip`: `public/tool.html`
 * links the Auto-Submit Kit three times and the web build genuinely serves it.
 *
 * But web and native share one `dist`, and `cap sync` copies the whole thing
 * into `ios/App/App/public` — so every iOS user was carrying a 32KB zip of a
 * Claude-plus-Chrome desktop skill they cannot open on a phone. The strip has
 * to happen AFTER the copy, against the native directory, or it breaks /tool.
 *
 * Generalize: `dist` is the web deliverable AND the native payload. Anything
 * that belongs to only one of them has to be removed on that side, never from
 * `dist` itself.
 */
import fs from 'node:fs';
import path from 'node:path';

// Web-only payloads, matched against the path relative to the native web root.
// Keep this list explicit rather than a glob: a stray pattern here silently
// deletes something the app needs, and the failure shows up as a blank screen
// in a shipped build rather than as a build error.
const WEB_ONLY = ['DrSelfTape-AutoSubmit-Kit.zip'];

const NATIVE_WEB_ROOTS = [
  'ios/App/App/public',
  'android/app/src/main/assets/public',
];

let removed = 0;
let missingRoots = 0;

for (const root of NATIVE_WEB_ROOTS) {
  if (!fs.existsSync(root)) {
    // Android is stripped from this repo (see reference_android_build); a
    // missing platform is normal and must not fail the sync.
    missingRoots += 1;
    continue;
  }
  for (const rel of WEB_ONLY) {
    const target = path.join(root, rel);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true });
      console.log(`stripped from native bundle: ${target}`);
      removed += 1;
    }
  }
}

if (missingRoots === NATIVE_WEB_ROOTS.length) {
  // Every platform missing means `cap sync` never ran, so this script ran in
  // the wrong order and silently did nothing. Say so loudly.
  console.error(
    'strip-native-cruft: no native web root found. Run `npx cap sync` first.',
  );
  process.exit(1);
}

if (!removed) console.log('strip-native-cruft: nothing to strip.');
