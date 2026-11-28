# Google Play upload (fastlane)

Uploads the signed Android AAB to the Play **internal testing** track with one command.
Binary only — never touches the store listing, images, or pricing.

## One-time setup (browser — only Joseph can do this)

The upload needs a Google Play service-account key. It is **not** in the repo and
**not** yet created. Do this once:

1. **Google Cloud Console → APIs & Services:** pick (or create) a project and enable the
   **Google Play Developer API**.
2. **Google Cloud Console → IAM & Admin → Service Accounts → Create service account** →
   name it `play-publisher` → copy its email address → **Done** (no GCP roles needed) →
   open it → **Keys → Add key → Create new key → JSON** (downloads a file).
3. Move the JSON to exactly (lives with the keystore, outside the repo):
   ```
   mv ~/Downloads/<that-file>.json ~/.dst-signing/play-service-account.json
   chmod 600 ~/.dst-signing/play-service-account.json
   ```
4. **Play Console → Users and permissions → Invite new users:** paste the service
   account's email and grant **"Release to testing tracks"** (or Release manager) on
   **Dr Self Tape**. Invite user.
   Propagation can take minutes (occasionally up to 24h).

> ⚠️ Google does not allow the Play Developer API to create an app's *first* release —
> that one must go through the Play Console web UI. Once any release exists, these lanes work.

## Upload

```
cd android
fastlane android internal                       # uploads the gradle release output
fastlane android internal aab:/abs/path/to.aab  # or an explicit AAB
```

## Build a fresh AAB first (if needed)

```
VITE_API_URL="https://drselftape-api-production.up.railway.app/api" yarn build
yarn sync:android
cd android && JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ./gradlew :app:bundleRelease
```
