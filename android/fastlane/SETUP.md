# Google Play upload (fastlane)

Uploads the signed Android AAB to the Play **internal testing** track with one command.
Binary only — never touches the store listing, images, or pricing.

## One-time setup (browser — only Joseph can do this)

The upload needs a Google Play service-account key. It is **not** in the repo and
**not** yet created. Do this once:

1. **Play Console → Setup → API access.** Link a Google Cloud project if prompted.
2. **Create new service account** → in GCP Console name it `play-publisher` → Done
   (no GCP roles needed) → **Keys → Add key → Create new key → JSON** (downloads a file).
3. Move the JSON to exactly (lives with the keystore, outside the repo):
   ```
   mv ~/Downloads/<that-file>.json ~/.dst-signing/play-service-account.json
   chmod 600 ~/.dst-signing/play-service-account.json
   ```
4. Back in **Play Console → Setup → API access**, grant the service account
   **"Release to testing tracks"** (or Release manager) on **Dr Self Tape**. Save.
   Propagation can take minutes (occasionally up to 24h).

> ⚠️ Google does not allow the Play Developer API to create an app's *first* release —
> that one must go through the Play Console web UI. Once any release exists, these lanes work.

## Upload

```
cd android
fastlane android internal                       # uploads the gradle release output
fastlane android internal aab:/abs/path/to.aab  # or an explicit AAB
```

Current build: `~/Downloads/dst-android-1.0.15-vc110.aab` (versionCode 110, 1.0.15).

## Build a fresh AAB first (if needed)

```
VITE_API_URL="https://drselftape-api-production.up.railway.app/api" yarn build
yarn sync:android
cd android && JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ./gradlew :app:bundleRelease
```
