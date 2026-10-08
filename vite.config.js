import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import fs from "node:fs";
import path from "node:path";
import { releaseSecurityPlugin, validateReleaseEnvironment } from './scripts/release-security.mjs';

// Recursively delete files Vite copied verbatim out of public/ that must never
// reach a user's device: Finder's .DS_Store (recreated any time the folder is
// opened, so .gitignore cannot stop it). Keep public downloads: /tool links
// to the Auto-Submit Kit ZIP, which must remain available in the web build.
function deleteBundleCruft(dir) {
  if (!fs.existsSync(dir)) return [];
  const removed = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) removed.push(...deleteBundleCruft(p));
    else if (entry.name === ".DS_Store") {
      fs.rmSync(p);
      removed.push(path.relative(dir, p) || entry.name);
    }
  }
  return removed;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    {
      name: "require-production-api-url",
      configResolved(config) {
        // Match import.meta.env.PROD: custom build modes can be production too.
        // Validate Vite's resolved env so shell and .env files both work.
        if (config.command === "build" && config.isProduction && !config.env.VITE_API_URL?.trim()) {
          throw new Error("VITE_API_URL must be set for production builds. Supply the deployment API base URL before running yarn build.");
        }
        if (config.command === 'build' && config.isProduction) validateReleaseEnvironment(config.env);
      },
    },
    react(),
    tailwindcss(),
    // Strip public/ cruft from the built output on every build, dev included,
    // so a .DS_Store created between builds can never ride into an app bundle.
    {
      name: "strip-bundle-cruft",
      apply: "build",
      closeBundle() {
        const removed = deleteBundleCruft("./dist");
        if (removed.length) {
          this.warn(`stripped from dist: ${removed.join(", ")}`);
        }
      },
    },
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
    // Run after upload hooks, for EVERY build mode and output directory.
    // A custom mode or a failed map cleanup must not expose our source.
    releaseSecurityPlugin(),
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
    sourcemap: mode === 'production' && process.env.SENTRY_AUTH_TOKEN ? 'hidden' : false,
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
