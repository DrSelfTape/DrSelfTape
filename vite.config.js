import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import fs from "node:fs";
import path from "node:path";

// Recursively delete *.map files under a directory.
function deleteSourceMaps(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) n += deleteSourceMaps(p);
    else if (entry.name.endsWith(".map")) { fs.rmSync(p); n += 1; }
  }
  return n;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Source-map upload to Sentry. Active only in production builds when
    // SENTRY_AUTH_TOKEN is present in the env (set on Vercel + locally in
    // ~/.dst-signing/sentry-user-token.txt). Without the token the plugin
    // skips upload — local dev builds stay fast.
    mode === 'production' && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: 'dr-self-tape',
      project: 'javascript-react',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './dist/**',
        // Strip .map files from /dist after upload so they aren't served
        // publicly from Vercel — Sentry has them, that's all that matters.
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      telemetry: false,
    }),
    // When Sentry is NOT uploading (any local/mobile build — no auth token),
    // the .map files would otherwise survive in dist/ and get copied into the
    // native app bundle by `cap sync`, shipping full unminified source inside
    // the IPA/AAB. Strip them after the bundle is written so neither store
    // build ever leaks source. (When the token IS set, the Sentry plugin's
    // filesToDeleteAfterUpload handles it after upload — so this no-ops there.)
    mode === 'production' && !process.env.SENTRY_AUTH_TOKEN && {
      name: 'strip-orphan-sourcemaps',
      closeBundle() {
        const removed = deleteSourceMaps('dist');
        if (removed) this.warn(`stripped ${removed} source map(s) from dist/ (no Sentry upload this build)`);
      },
    },
  ].filter(Boolean),
  // Strip console.* and debugger statements from production bundles only.
  // Sentry captures real exceptions via ErrorBoundary; the remaining
  // console.error/warn/log calls were diagnostic noise that spammed
  // TestFlight logs and added zero production signal. Dev builds keep
  // them so local debugging still works.
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  build: {
    // Emit source maps so the Sentry plugin can upload them.
    // They get uploaded then deleted from /dist if filesToDeleteAfterUpload
    // is set — but for cleanliness Vercel already strips .map files from
    // the served build. Keep them in /dist for the upload step.
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-redux": ["@reduxjs/toolkit", "react-redux", "redux-persist"],
          "vendor-recharts": ["recharts"],
          "vendor-lucide": ["lucide-react"],
          "vendor-mui": ["@mui/material", "@mui/icons-material", "@mui/x-date-pickers", "@emotion/react", "@emotion/styled", "@emotion/cache"],
          "vendor-calendar": [
            "@fullcalendar/core",
            "@fullcalendar/daygrid",
            "@fullcalendar/interaction",
            "@fullcalendar/react",
            "@fullcalendar/timegrid",
          ],
          "vendor-apexcharts": ["apexcharts", "react-apexcharts"],
          "vendor-ai": ["pdfjs-dist"],
          "vendor-sentry": ["@sentry/react"],
          // posthog is dynamically imported only when VITE_POSTHOG_KEY is set;
          // Rollup will emit its chunk on demand, so we don't pre-declare it.
          "vendor-webrtc": ["@daily-co/daily-js", "peerjs"],
          "vendor-media": ["react-media-recorder", "html2canvas", "canvas-confetti"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "vendor-headlessui": ["@headlessui/react"],
          "vendor-dates": ["dayjs"],
        },
      },
    },
  },
}));
