# Connect your terminal to your iPhone (live-reload)

Run the Vite dev server in your **Mac terminal** and have the Dr Self Tape app
on your **physical iPhone** load from it. Save a file → it reloads on the phone.
No rebuild, no re-deploy.

> This only works from your Mac (Xcode + the phone on the same Wi‑Fi). It cannot
> be done from the cloud container — that environment can't see your phone.

## One-time setup

1. **Same network** — Mac and iPhone on the same Wi‑Fi.
2. **Xcode + device** — iPhone plugged in (or wireless-debugging enabled),
   trusted, and selectable in Xcode. Open the project once if needed:
   ```bash
   npm run ios:open
   ```
   Set your Apple Developer team under *Signing & Capabilities* so the app can
   install on a real device.
3. **Find your Mac's LAN IP** (used for the API below):
   ```bash
   ipconfig getifaddr en0   # Wi‑Fi; try en1 if blank
   ```

## Point the app at your backend

On-device, `localhost` means the **phone**, not your Mac — so the API base URL
must use your Mac's LAN IP, or every request fails. The app reads `VITE_API_URL`
(`src/redux/constant.js`). Create `.env.local` (git-ignored):

```bash
# .env.local  — replace with your Mac's LAN IP from step 3
VITE_API_URL=http://192.168.1.42:8000/api
```

Make sure the Django/Daphne backend is reachable on that IP, not just
`127.0.0.1`:

```bash
daphne -b 0.0.0.0 -p 8000 self_tape_api.asgi:application
```

(WebSockets in `src/socket/socket.jsx` derive from the same `baseURL`, so they
follow automatically.)

## Run it

```bash
npm run ios:live
```

This runs `cap run ios --livereload --external`, which:

- starts the Vite dev server (bound to `0.0.0.0:5173`, configured in
  `vite.config.js`),
- injects `http://<your-mac-LAN-IP>:5173` as the WebView URL, and
- builds + deploys to the selected iPhone.

Pick your device if prompted. Once it launches, edit any file under `src/` and
the phone reloads instantly.

## Back to a normal build

Live-reload only patches the running session — nothing is committed to the
native project. To return to a self-contained build:

```bash
npm run build && npm run ios:sync
```

## Troubleshooting

- **Blank/white screen** — phone can't reach the dev server. Confirm same
  Wi‑Fi, and that nothing (firewall/VPN) blocks port `5173`. macOS may prompt to
  allow incoming connections for Node — allow it.
- **App loads but no data / login fails** — `VITE_API_URL` still points at
  `localhost`, or the backend isn't bound to `0.0.0.0`. Recheck both above.
- **Won't install on device** — signing team not set; open with
  `npm run ios:open` and fix *Signing & Capabilities*.
- **Port already in use** — `strictPort` means Vite won't silently pick another
  port; stop the other process (or change the port in `vite.config.js`).
