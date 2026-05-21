import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Strip console.* and debugger statements from production bundles only.
  // Sentry captures real exceptions via ErrorBoundary; the remaining
  // console.error/warn/log calls were diagnostic noise that spammed
  // TestFlight logs and added zero production signal. Dev builds keep
  // them so local debugging still works.
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  build: {
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
