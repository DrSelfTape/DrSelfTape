import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
          "vendor-dates": ["date-fns", "dayjs"],
        },
      },
    },
  },
});
