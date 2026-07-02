import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { useTokenBalance } from "../../hooks/useTokenBalance";
import NoTokensModal from "../../components/NoTokensModal";
import UpdateBanner from "../../components/UpdateBanner";
import WhatsNewModal from "../../components/WhatsNewModal";
import ReportProblemModal from "../../components/ReportProblemModal";
import { isEmptyScript, pdfVisionFallback } from "../../utils/pdfToScript";
import { fetchAuditionsThunk, fetchAuditionStatsThunk, createAuditionThunk, updateAuditionThunk } from "../../redux/features/auditions/auditionsSlice";
import { getScripts } from "../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice";
import { fetchSubmissionsThunk, promoteToAuditionThunk } from "../../redux/features/submissions/submissionsSlice";
import { fetchScriptsThunk, createScriptThunk, deleteScriptThunk } from "../../redux/features/scripts/scriptsSlice";
import { fetchProfileThunk } from "../../redux/features/profile/profileSlice";
import { markStep } from "../../components/Dashboard/TutorialChecklist";
import { logoutUser, performLogout } from "../../redux/features/auth/authSlice";
import { fetchMatchingStats, toggleAvailability } from "../../redux/features/readers/readersMatchSlice";
import PendingLikesBanner from "../../components/Dashboard/PendingLikesBanner";
import ProfileCompleteness from "../../components/Dashboard/ProfileCompleteness";
import DeleteAccountModal from "../../components/Dashboard/DeleteAccountModal";
import ReaderOnboardingModal from "../../components/Dashboard/ReaderOnboardingModal";
import SidesUpload from "../Dashboard/SceneStudy/SidesUpload";
import AuroraOnboarding from "../Onboarding/AuroraOnboarding";
import { V1HeroGraph, V1FAB, V1Sparkles } from "../../components/Aurora";
import { AuroraHUD, AuroraQuests, AuroraStreakGuard, AuroraSeason, AuroraProgressCard, auroraCelebrate, SlateTip } from "../../components/Aurora/game";
import NotificationBell from "../../components/Dashboard/NotificationBell";
import TutorialChecklist from "../../components/Dashboard/TutorialChecklist";
import TutorialAchievement from "../../components/Dashboard/TutorialAchievement";
import DailyChallengeCard from "../../components/Dashboard/DailyChallengeCard";
import { logo } from "../../assets/images";
import axiosInstance from "../../redux/http";
import endPoints from "../../redux/constant";
import * as pdfjsLib from "pdfjs-dist";
import { extractCharacters } from "../../utils/scriptParser";

import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

// Simple hash for caching — avoids re-calling GPT on same content
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 500); i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent({ includeMarkedContent: false });
    const items = content.items.filter((item) => item.str?.trim());

    if (items.length > 0) {
      // Find dominant font size (body text) and filter out watermarks
      const sizeMap = {};
      items.forEach((item) => {
        const h = Math.round(Math.abs(item.transform[3]));
        sizeMap[h] = (sizeMap[h] || 0) + item.str.length;
      });
      const dominantSize = parseInt(Object.entries(sizeMap).sort((a, b) => b[1] - a[1])[0]?.[0]);
      const filtered = items.filter((item) => Math.abs(Math.round(Math.abs(item.transform[3])) - dominantSize) <= 2);
      const workItems = filtered.length > items.length * 0.3 ? filtered : items;

      // Sort by Y axis (top to bottom), then X (left to right)
      workItems.sort((a, b) => {
        const yDiff = Math.round(b.transform[5]) - Math.round(a.transform[5]);
        if (Math.abs(yDiff) > 4) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      // Group into lines by Y position
      const lines = [];
      let currentY = null;
      let currentLine = [];
      for (const item of workItems) {
        const y = Math.round(item.transform[5]);
        if (currentY === null || Math.abs(y - currentY) <= 4) {
          currentLine.push(item.str);
          currentY = y;
        } else {
          if (currentLine.length) lines.push(currentLine.join(''));
          currentLine = [item.str];
          currentY = y;
        }
      }
      if (currentLine.length) lines.push(currentLine.join(''));
      pageTexts.push(lines.join('\n'));
    }
  }

  return pageTexts.join('\n\n');
}

/* Lazy-load dashboard panels for the "More" menu */
const CDSim = lazy(() => import("../Dashboard/CDSim"));
const Jericho = lazy(() => import("../Dashboard/Jericho"));
const CraftJourney = lazy(() => import("../Dashboard/CraftJourney"));
const Leaderboard = lazy(() => import("../Dashboard/Leaderboard"));
const TapeReview = lazy(() => import("../Dashboard/Jericho/TapeReview"));

const WhoWantsToRead = lazy(() => import("../Dashboard/FindAReader/WhoWantsToRead"));
const Favorites = lazy(() => import("../Dashboard/FindAReader/Favorites"));
const FindAReader = lazy(() => import("../Dashboard/FindAReader"));
const GreenRoom = lazy(() => import("../Dashboard/FindAReader/GreenRoom"));
const GreenRoomChat = lazy(() => import("../Dashboard/FindAReader/GreenRoomChat"));
const ReaderProfile = lazy(() => import("../Dashboard/FindAReader/ReaderProfile"));
const ItsAScene = lazy(() => import("../Dashboard/FindAReader/ItsAScene"));
const LiveRehearsals = lazy(() => Promise.resolve({ default: () => null }));
const Community = lazy(() => Promise.resolve({ default: () => null }));
const Scripts = lazy(() => import("../Dashboard/Scripts"));
const Submissions = lazy(() => import("../Dashboard/Submissions"));
const Reports = lazy(() => import("../Dashboard/Reports"));
const Insights = lazy(() => Promise.resolve({ default: () => null }));
const Membership = lazy(() => import("../Dashboard/Membership"));
const BookSession = lazy(() => Promise.resolve({ default: () => null }));
const Bookings = lazy(() => Promise.resolve({ default: () => null }));
const DashProfile = lazy(() => import("../Dashboard/Profile"));
const AgentPortal = lazy(() => Promise.resolve({ default: () => null }));
const AuditionGenerator = lazy(() => import("../Dashboard/AuditionGenerator"));
const SceneStudy = lazy(() => import("../Dashboard/SceneStudy"));
const MeetingRoom = lazy(() => import("../Meeting/MeetingRoom"));
const Referral = lazy(() => import("../Dashboard/Referral"));
const Marketplace = lazy(() => import("../Dashboard/Marketplace"));
const SelfTapesPanel = lazy(() => import("../Dashboard/SelfTapes"));

/* ═══════════════════════════════════════════════════
   BRAND TOKENS — from Dr Self Tape Brand Guideline
   ═══════════════════════════════════════════════════ */
const MINT = "#A7ECDA";
const MINT_DIM = "rgba(167,236,218,0.12)";
const MINT_DEEP = "#1a2e2a";
const GOLD = "#FCE072";
const GOLD_DIM = "rgba(252,224,114,0.12)";
const CORAL_SOFT = "#FFB49A";
const CORAL_SOFT_DIM = "rgba(255,180,154,0.10)";
const CORAL = "#FF8280";
const CORAL_DIM = "rgba(255,130,128,0.12)";
const CORAL_GLOW = "rgba(255,130,128,0.25)";
// Magenta is retained as a sub-accent (e.g., PRO badges, premium AI sparkles).
// Apply selectively — do NOT use as a primary CTA color. Bright Coral is the
// brand's primary action color per the brand guideline.
const MAGENTA = "#C855F0";
const MAGENTA_DIM = "rgba(200,85,240,0.12)";

const BG_DEEPEST = "#080a0f";
const BG_DEEP = "#0c0e14";
const BG_CARD = "#13151d";
const BG_ELEVATED = "#1a1c26";
const BORDER = "rgba(167,236,218,0.06)";
const BORDER_ACTIVE = "rgba(167,236,218,0.15)";
const TEXT_PRIMARY = "#f2f0ed";
const TEXT_SECONDARY = "#8a9a96";
const TEXT_MUTED = "#4a5a56";

const GREEN = "#5ee6b8";
const BLUE = "#7eb8ec";
const AMBER = GOLD;
const RED = CORAL;

/* ── UI Refinement tokens ── */
const RADIUS_LG = 22;
const RADIUS_MD = 16;
const SPACING_SECTION = 28;
const CARD_BORDER = "rgba(167,236,218,0.04)";
const CARD_SHADOW = "0 2px 16px rgba(0,0,0,0.12)";

const STATUS_COLORS = {
  submitted: TEXT_MUTED,
  in_review: BLUE,
  audition: "#FF8280",
  callback: GOLD,
  booked: GREEN,
  passed: CORAL,
};

const TYPE_COLORS = {
  film: CORAL,
  commercial: BLUE,
  theatrical: "#b89aff",
  theater: GREEN,
  voiceover: GOLD,
  industrial: TEXT_SECONDARY,
};

function mapAudition(a) {
  return {
    id: a.id,
    project: a.project_title || a.project || "",
    character: a.character || "",
    cd: a.casting_director || a.cd || "",
    type: a.project_type || a.type || "",
    status: a.status === "reviewed" ? "in_review" : a.status === "audition" ? "audition" : (a.status || "submitted"),
    callbackDate: a.callback_date || a.callbackDate || null,
    agency: a.agency || "",
    // The Home hero ring / pipeline chart / callback-rate aggregator
    // bucket by created_at. Previously mapAudition dropped that field
    // and every audition got filtered out of the time series, so the
    // pipeline read 0/0/0/0 even when the user had real entries.
    createdAt: a.created_at || a.createdAt || a.submitted_at || a.submittedAt || null,
    created_at: a.created_at || a.createdAt || a.submitted_at || a.submittedAt || null,
  };
}

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function mapScript(s) {
  return {
    id: s.id,
    title: s.title || "",
    pages: s.description || "Script",
    lastPracticed: relativeTime(s.created_at) || s.lastPracticed || "",
    progress: s.progress || 0,
    content: s.content || s.script_content || s.text || "",
    characters: Array.isArray(s.characters) ? s.characters : [],
  };
}

/* ═══════════════════════════════════════════════════
   ICON SYSTEM
   ═══════════════════════════════════════════════════ */
function Icon({ name, size = 20, color = TEXT_SECONDARY }) {
  const p = {
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1",
    auditions: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    target: "M12 21a9 9 0 100-18 9 9 0 000 18zm0-3a6 6 0 110-12 6 6 0 010 12zm0-3a3 3 0 100-6 3 3 0 000 6z",
    scenes: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
    mic: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
    profile: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    plus: "M12 4v16m8-8H4",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    play: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z",
    chevron: "M9 5l7 7-7 7",
    check: "M5 13l4 4L19 7",
    x: "M6 18L18 6M6 6l12 12",
    clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    fire: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
    star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    community: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    sparkle: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    more: "M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z",
    back: "M15 19l-7-7 7-7",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    agent: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    tape: "M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zM3 9h18M3 15h18M8 4v16M16 4v16",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={p[name] || p.home} />
    </svg>
  );
}

function ProgressRing({ pct, size = 36, stroke = 3 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={MINT} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

/* ── Aurora hero metric ring ──
 * Three-tab interactive ring showing callback rate / submissions / booked.
 * Animated arc + 12 trend dots + center number.
 * Tap a dot to scrub; tap a metric pill to switch.
 */
/* ── 12-period hero graph data ───────────────────────────────────────
 * Buckets the user's auditions into 12 weeks / 12 months / 12 quarters
 * and emits the {labels, callback, submitted, booked} shape that
 * V1HeroGraph consumes. submitted = count of auditions whose
 * created_at falls in the period; callback = subset whose CURRENT
 * status is callback/audition/booked (best available proxy without
 * a status-history table); booked = subset whose status is booked.
 * Periods with no data render as 0. */
function buildHeroData(auditions) {
  const now = new Date();
  const list = Array.isArray(auditions) ? auditions : [];

  const startOfWeek = (d) => {
    const x = new Date(d);
    const day = x.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const quarterOf = (d) => Math.floor(d.getMonth() / 3);
  const startOfQuarter = (d) => new Date(d.getFullYear(), quarterOf(d) * 3, 1);

  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  // 'D' = 7 daily buckets (one week), 'W' = 12 weekly buckets,
  // 'Y' = 12 monthly buckets across the past year.
  const bucketCountFor = (k) => (k === 'D' ? 7 : 12);

  const bucketsFor = (periodKey) => {
    const buckets = [];
    const count = bucketCountFor(periodKey);
    for (let i = count - 1; i >= 0; i--) {
      const ref = new Date(now);
      let start, label;
      if (periodKey === 'D') {
        ref.setDate(ref.getDate() - i);
        start = startOfDay(ref);
        label = start.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      } else if (periodKey === 'W') {
        ref.setDate(ref.getDate() - 7 * i);
        start = startOfWeek(ref);
        const wk = Math.ceil(((start - new Date(start.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
        label = `W${wk}`;
      } else {
        ref.setMonth(ref.getMonth() - i);
        start = startOfMonth(ref);
        label = start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      }
      let end;
      if (periodKey === 'D') { end = new Date(start); end.setDate(end.getDate() + 1); }
      else if (periodKey === 'W') { end = new Date(start); end.setDate(end.getDate() + 7); }
      else { end = new Date(start.getFullYear(), start.getMonth() + 1, 1); }
      buckets.push({ label, start, end });
    }
    return buckets;
  };

  const aggregate = (periodKey) => {
    const buckets = bucketsFor(periodKey);
    const count = buckets.length;
    const labels = buckets.map(b => b.label);
    const submitted = new Array(count).fill(0);
    const callback = new Array(count).fill(0);
    const booked = new Array(count).fill(0);

    list.forEach((a) => {
      const created = a.createdAt || a.created_at || a.submittedAt;
      if (!created) return;
      const d = new Date(created);
      if (Number.isNaN(d.getTime())) return;
      const bucketIdx = buckets.findIndex(b => d >= b.start && d < b.end);
      if (bucketIdx === -1) return;
      submitted[bucketIdx] += 1;
      const status = a.status || '';
      if (status === 'callback' || status === 'audition' || status === 'booked') callback[bucketIdx] += 1;
      if (status === 'booked') booked[bucketIdx] += 1;
    });

    // For callback metric, show RATE (%) not raw count — same metric the
    // existing dashboard headlines use ("callback rate").
    const callbackRate = submitted.map((s, i) => s > 0 ? Math.round((callback[i] / s) * 100) : 0);

    const periodLabelMap = { D: '7 DAYS', W: '12 WEEKS', Y: 'BY YEAR' };
    return { label: periodLabelMap[periodKey], labels, callback: callbackRate, submitted, booked };
  };

  return {
    D: aggregate('D'),
    W: aggregate('W'),
    Y: aggregate('Y'),
  };
}

function AuroraHeroRing({ stats, auditions }) {
  // Prefer the local audition list (always fresh after a status change)
  // over the cached stats endpoint. Falls back to stats if auditions is
  // not yet loaded (initial render).
  const hasLocal = Array.isArray(auditions) && auditions.length > 0;
  const total   = hasLocal
    ? auditions.length
    : Math.max(stats?.total_auditions || 0, 0);
  const cbCount = hasLocal
    ? auditions.filter(a => a.status === 'callback' || a.status === 'audition').length
    : Math.max(stats?.callbacks || 0, 0);
  const booked  = hasLocal
    ? auditions.filter(a => a.status === 'booked').length
    : Math.max(stats?.total_booked || 0, 0);
  const cbRate  = total > 0 ? Math.round((cbCount / total) * 100) : 0;

  // Use antique gold for the primary CB ring (matches the Aurora design ref).
  // Sky for SUB, mint for BK — pastels per the reference.
  const METRICS = [
    { id: 'cb',  label: 'CB',  color: 'var(--aurora-heritage-gold)', shadow: 'rgba(212,168,95,0.30)',  value: cbRate, suffix: '%', subline: 'callback rate' },
    { id: 'sub', label: 'SUB', color: 'var(--aurora-sky)',           shadow: 'rgba(167,214,255,0.30)', value: total,  suffix: '',  subline: 'submissions'  },
    { id: 'bk',  label: 'BK',  color: 'var(--aurora-mint)',          shadow: 'rgba(159,230,180,0.30)', value: booked, suffix: '',  subline: 'booked'       },
  ];

  const [active, setActive] = useState('cb');
  const m = METRICS.find(x => x.id === active);
  const arcMax = active === 'cb' ? 100 : Math.max(total, 10);
  const arcPct = Math.min(m.value / arcMax, 1);

  const SIZE = 234;
  const STROKE = 12;
  const r = 86;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - arcPct);
  const angle = -Math.PI / 2 + (2 * Math.PI * arcPct);
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy + r * Math.sin(angle);

  return (
    <div className="aurora-card" style={{ padding: 20, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="aurora-eyebrow">{active === 'cb' ? 'CALLBACK RATE' : active === 'sub' ? 'SUBMISSIONS' : 'BOOKINGS'}</span>
        <span className="aurora-mono" style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 100,
          background: 'color-mix(in oklch, var(--aurora-mint) 22%, transparent)',
          color: 'color-mix(in oklch, var(--aurora-mint) 70%, var(--aurora-text))',
          letterSpacing: '0.05em',
        }}>
          ↑ ALL TIME
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
        {METRICS.map(x => (
          <button
            key={x.id}
            onClick={() => setActive(x.id)}
            className="aurora-mono"
            style={{
              padding: '8px 0', borderRadius: 100, border: 'none', cursor: 'pointer',
              fontSize: 11, letterSpacing: '0.1em',
              background: active === x.id ? x.color : 'var(--aurora-line-soft)',
              color: active === x.id ? '#0E0D0A' : 'var(--aurora-sub)',
              boxShadow: active === x.id ? `0 4px 12px ${x.shadow}` : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', width: SIZE, height: SIZE, margin: '0 auto' }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--aurora-line)" strokeWidth={STROKE} />
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={m.color} strokeWidth={STROKE}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.65s cubic-bezier(.5,.1,.2,1)' }}
          />
          {m.value > 0 && (
            <circle cx={dotX} cy={dotY} r={6} fill={m.color} stroke="var(--aurora-surface-solid)" strokeWidth={2.5}
              style={{ transition: 'cx 0.65s cubic-bezier(.5,.1,.2,1), cy 0.65s cubic-bezier(.5,.1,.2,1)' }}
            />
          )}
        </svg>

        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <span className="aurora-mono" style={{ fontSize: 58, color: 'var(--aurora-text)' }}>
            {m.value}
            <span style={{ fontSize: 24, color: 'var(--aurora-dim)', marginLeft: 2 }}>{m.suffix}</span>
          </span>
          <span style={{ fontSize: 13, color: 'var(--aurora-sub)', marginTop: -4 }}>{m.subline}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Aurora practice strip ── 7-day chart of actual practice minutes
   plus today / soft-goal headline. Logged by LiveSceneMode on session end. */
function AuroraPracticeStrip() {
  const [week, setWeek] = useState([]);  // [{ date, seconds }, ...] oldest → newest
  const [goal, setGoal] = useState(600); // 10 min default
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  useEffect(() => {
    axiosInstance.get('/v1/growth/practice/week/').then(res => {
      const d = res?.data?.data;
      if (d?.days) setWeek(d.days);
      if (d?.daily_goal_seconds) setGoal(d.daily_goal_seconds);
    }).catch(() => {});
  }, []);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaySeconds = (week.find(d => d.date === todayIso)?.seconds) || 0;
  const goalMin = Math.round(goal / 60);
  const todayMin = Math.floor(todaySeconds / 60);
  const pctOfGoal = Math.min(Math.round((todaySeconds / Math.max(goal, 1)) * 100), 999);
  const max = Math.max(...week.map(d => d.seconds), goal, 1);

  return (
    <div className="aurora-card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="aurora-eyebrow">PRACTICE · TODAY</span>
        <span className="aurora-mono" style={{ color: 'var(--aurora-text)', fontSize: 12 }}>
          {todayMin} <span style={{ color: 'var(--aurora-dim)' }}>/ {goalMin} min</span>
          {todaySeconds >= goal && (
            <span style={{
              marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 100,
              background: 'color-mix(in oklch, var(--aurora-mint) 22%, transparent)',
              color: 'color-mix(in oklch, var(--aurora-mint) 75%, var(--aurora-text))',
              letterSpacing: '0.08em',
            }}>GOAL ✓</span>
          )}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, height: 56, alignItems: 'flex-end' }}>
        {week.map((d, i) => {
          const h = (d.seconds / max) * 100;
          const isToday = d.date === todayIso;
          const dayOfWeek = ((new Date(d.date).getDay() + 6) % 7);
          return (
            <div key={d.date || i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%',
                height: d.seconds > 0 ? `${Math.max(h, 12)}%` : 4,
                background: isToday
                  ? 'var(--aurora-heritage-gold)'
                  : d.seconds > 0 ? 'var(--aurora-sky)' : 'var(--aurora-line)',
                borderRadius: 4,
                transition: 'height 0.4s ease',
              }} />
              <span className="aurora-micro" style={{
                fontSize: 9, color: isToday ? 'var(--aurora-text)' : 'var(--aurora-dim)',
                fontWeight: isToday ? 700 : 500,
              }}>{days[dayOfWeek]}</span>
            </div>
          );
        })}
      </div>
      {todaySeconds >= goal && pctOfGoal > 120 && (
        <p className="aurora-micro" style={{
          color: 'var(--aurora-sub)', marginTop: 10, textAlign: 'center', fontStyle: 'italic',
        }}>
          You're past today's goal — feel free to keep going, or rest the voice.
        </p>
      )}
    </div>
  );
}

/* ── Aurora pipeline blocks ── Submitted / Reviewed / Callback / Booked
 * Heights are proportional to value (handoff §6 spec). Each bar gets
 * a 180deg gradient, a 2px white inner top highlight, and a colored
 * drop shadow. Numbers in JetBrains Mono on top. */
function AuroraPipeline({ stats, auditions, setTab }) {
  const counts = {
    sub: auditions.filter(a => a.status === 'submitted').length,
    rev: auditions.filter(a => a.status === 'in_review').length,
    cb:  auditions.filter(a => a.status === 'callback' || a.status === 'audition').length,
    bk:  stats?.total_booked || auditions.filter(a => a.status === 'booked').length,
  };
  const blocks = [
    { id: 'sub', label: 'SUB', val: counts.sub, color: '#A7D6FF', shadow: 'rgba(167,214,255,0.45)' },
    { id: 'rev', label: 'REV', val: counts.rev, color: '#D8C5F2', shadow: 'rgba(216,197,242,0.45)' },
    { id: 'cb',  label: 'CB',  val: counts.cb,  color: '#D4A85F', shadow: 'rgba(212,168,95,0.45)' },
    { id: 'bk',  label: 'BK',  val: counts.bk,  color: '#9FE6B4', shadow: 'rgba(159,230,180,0.45)' },
  ];
  const max = Math.max(...blocks.map(b => b.val), 1);

  return (
    <div className="aurora-card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span className="aurora-eyebrow" style={{ color: 'var(--aurora-dim)' }}>PIPELINE</span>
        <button
          onClick={() => setTab('auditions')}
          className="aurora-micro"
          style={{
            background: 'none', border: 'none', color: 'var(--aurora-sub)',
            cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, letterSpacing: '0.15em',
          }}
        >
          VIEW ALL →
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, height: 110, alignItems: 'flex-end' }}>
        {blocks.map((b) => {
          const h = (b.val / max) * 86 + 20;
          return (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              <div
                style={{
                  height: h,
                  borderRadius: 12,
                  background: `linear-gradient(180deg, ${b.color} 0%, ${b.color}AA 100%)`,
                  border: '1px solid rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  paddingTop: 8,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: `0 6px 14px ${b.shadow}`,
                  transition: 'height 0.5s cubic-bezier(.2,.7,.3,1)',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.6)' }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, color: '#0A0A0A', fontWeight: 600 }}>{b.val}</span>
              </div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9,
                  color: 'var(--aurora-sub)',
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                  marginTop: 8,
                }}
              >
                {b.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Aurora "Today" section ──
 * 7-day date strip + 3 daily craft trackers (sides, rehearsal minutes, tapes).
 * Date dots are derived from real data; tracker progress mixes server data
 * (rehearsal minutes from /v1/growth/practice/week) with local-state
 * persistence for the quick-add trackers.
 *
 * Aurora handoff §14.3 — V1Today equivalent.
 */
function AuroraToday({ auditions, submissions, scripts, setTab, setCurrentPanel }) {
  const today = new Date();
  const todayN = today.getDate();
  const isoToday = today.toISOString().slice(0, 10);

  // Build 7-day strip centered on today (3 before, today, 3 after)
  const days = [];
  for (let off = -3; off <= 3; off += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + off);
    const labels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    days.push({
      d: labels[d.getDay()],
      n: d.getDate(),
      iso: d.toISOString().slice(0, 10),
    });
  }

  // Compute events per date (callback / sub / tape / coach)
  const events = {};
  auditions?.forEach((a) => {
    if (a.callbackDate) {
      const iso = String(a.callbackDate).slice(0, 10);
      events[iso] = "callback";
    }
  });
  submissions?.forEach((s) => {
    const iso = String(s.created_at || s.createdAt || "").slice(0, 10);
    if (iso) events[iso] = events[iso] || (s.self_tape_url ? "tape" : "sub");
  });

  const evColor = {
    sub: "var(--aurora-sky)",
    callback: "var(--aurora-heritage-gold)",
    tape: "var(--aurora-peach)",
    coach: "var(--aurora-mint)",
  };

  const [sel, setSel] = useState(isoToday);

  // ─── Trackers ───
  // Self-tapes sent: count of submissions created today
  const tapesToday = (submissions || []).filter((s) => {
    const iso = String(s.created_at || s.createdAt || "").slice(0, 10);
    return iso === isoToday;
  }).length;

  // Sides memorized: local state (per-day localStorage)
  const sidesKey = `dst_today_sides_${isoToday}`;
  const [sidesDone, setSidesDone] = useState(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(sidesKey) : null;
    return raw ? parseInt(raw, 10) || 0 : 0;
  });
  useEffect(() => {
    try { window.localStorage.setItem(sidesKey, String(sidesDone)); } catch {}
  }, [sidesDone, sidesKey]);

  // Rehearsal minutes: pulled from /v1/growth/practice/week
  const [rehearsalSec, setRehearsalSec] = useState(0);
  const [rehearsalGoal, setRehearsalGoal] = useState(600);
  useEffect(() => {
    axiosInstance.get('/v1/growth/practice/week/').then((res) => {
      const d = res?.data?.data;
      const todayRow = (d?.days || []).find((x) => x.date === isoToday);
      if (todayRow) setRehearsalSec(todayRow.seconds || 0);
      if (d?.daily_goal_seconds) setRehearsalGoal(d.daily_goal_seconds);
    }).catch(() => {});
  }, [isoToday]);

  const trackers = [
    {
      id: 'sides',
      label: 'Sides memorized',
      icon: 'book',
      tint: 'var(--aurora-sky)',
      tintAlpha: 'rgba(167,214,255,0.18)',
      tintBorder: 'rgba(167,214,255,0.35)',
      done: sidesDone, goal: 2, unit: '',
      onBump: () => setSidesDone((n) => Math.min(2, n + 1)),
    },
    {
      id: 'rehearsal',
      label: 'Rehearsal minutes',
      icon: 'mic',
      tint: 'var(--aurora-mint)',
      tintAlpha: 'rgba(159,230,180,0.18)',
      tintBorder: 'rgba(159,230,180,0.35)',
      done: Math.floor(rehearsalSec / 60),
      goal: Math.round(rehearsalGoal / 60),
      unit: 'm',
      onBump: () => setTab && setTab('scenes'),
    },
    {
      id: 'tapes',
      label: 'Self-tapes sent',
      icon: 'play',
      tint: 'var(--aurora-peach)',
      tintAlpha: 'rgba(255,201,163,0.18)',
      tintBorder: 'rgba(255,201,163,0.35)',
      done: tapesToday, goal: 3, unit: '',
      onBump: () => setCurrentPanel && setCurrentPanel('self-tapes'),
    },
  ];

  const completed = trackers.filter((t) => t.done >= t.goal).length;
  const allDone = completed === trackers.length;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* 7-day date strip */}
      <div className="aurora-card" style={{ padding: '14px 12px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {days.map((day) => {
            const on = sel === day.iso;
            const ev = events[day.iso];
            const isToday = day.iso === isoToday;
            return (
              <button
                key={day.iso}
                onClick={() => setSel(day.iso)}
                style={{
                  flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '2px 0',
                }}
              >
                <span className="aurora-micro" style={{ fontSize: 8, letterSpacing: '0.12em', color: on ? 'var(--aurora-accent-deep)' : 'var(--aurora-dim)' }}>{day.d}</span>
                <span className="aurora-mono" style={{
                  width: 32, height: 32, borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 500,
                  background: on ? 'var(--aurora-heritage-gold)' : isToday ? 'rgba(212,168,95,0.18)' : 'transparent',
                  color: on ? '#1A1408' : 'var(--aurora-text)',
                  boxShadow: on ? '0 4px 12px rgba(212,168,95,0.40)' : 'none',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}>{day.n}</span>
                <span style={{ width: 5, height: 5, borderRadius: 100, background: ev ? evColor[ev] : 'transparent' }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily craft trackers */}
      <div className="aurora-card" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="aurora-eyebrow">TODAY&rsquo;S CRAFT</span>
          {allDone ? (
            <span className="aurora-micro" style={{
              fontSize: 9, color: '#0E0D0A',
              background: 'var(--aurora-mint)',
              padding: '3px 8px', borderRadius: 100, letterSpacing: '0.1em',
            }}>ALL DONE ✦</span>
          ) : (
            <span className="aurora-micro" style={{ fontSize: 9, color: 'var(--aurora-dim)', letterSpacing: '0.12em' }}>
              {completed}/{trackers.length} COMPLETE
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trackers.map((t) => {
            const pct = Math.min(1, t.done / Math.max(t.goal, 1));
            const full = t.done >= t.goal;
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 16,
                background: t.tintAlpha,
                border: `1px solid ${t.tintBorder}`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${pct * 100}%`,
                  background: `color-mix(in oklch, ${t.tint} 30%, transparent)`,
                  transition: 'width 0.4s cubic-bezier(.2,.7,.3,1)',
                }} />
                <div style={{
                  position: 'relative', width: 34, height: 34, borderRadius: 10,
                  background: 'var(--aurora-surface-solid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(10,10,10,0.06)',
                }}>
                  <Icon name={t.icon} size={18} color="var(--aurora-accent-deep)" />
                </div>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px', color: 'var(--aurora-text)' }}>{t.label}</div>
                  <div className="aurora-mono" style={{ fontSize: 10, color: 'var(--aurora-sub)', marginTop: 2, letterSpacing: '0.05em' }}>
                    {t.done}{t.unit} / {t.goal}{t.unit}
                  </div>
                </div>
                <button
                  onClick={t.onBump}
                  disabled={full}
                  style={{
                    position: 'relative', width: 34, height: 34, borderRadius: 100, flexShrink: 0,
                    cursor: full ? 'default' : 'pointer',
                    background: full ? 'var(--aurora-mint)' : 'var(--aurora-surface-solid)',
                    border: full ? 'none' : `1.5px solid ${t.tint}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: full ? 'none' : '0 2px 6px rgba(10,10,10,0.06)',
                  }}
                >
                  <Icon name={full ? 'check' : 'plus'} size={16} color="#1A1408" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function callbackBadge(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return { text: "Today", urgent: true };
  if (diff === 1) return { text: "Tomorrow", urgent: true };
  if (diff <= 7) return { text: `${diff}d`, urgent: false };
  return null;
}

const TABS = [
  { id: "home", icon: "home", label: "Home" },
  { id: "scenes", icon: "scenes", label: "Practice" },
  { id: "auditions", icon: "auditions", label: "Auditions" },
  { id: "find-a-reader", icon: "community", label: "Reader" },
  { id: "green-room", icon: "mic", label: "Room" },
  { id: "tape-review", icon: "tape", label: "Tape", highlight: true },
  { id: "more", icon: "more", label: "More" },
];

const MORE_FEATURES = [
  { id: "jericho", label: "My Growth", desc: "Your evolving actor DNA and coaching insights", emoji: "🧠", color: "#FF8280" },
  { id: "cd-sim", label: "Acting Coach", desc: "Get expert feedback on your scene work", emoji: "🎭", color: "#FF8280" },
  { id: "scripts", label: "Scripts", desc: "Your personal script library", emoji: "📝", color: "#FFB49A" },
  { id: "submissions", label: "Submissions", desc: "Track every tape you send", emoji: "📤", color: "#5ee6b8" },
  { id: "generator", label: "Scene Generator", desc: "AI-written sides on demand", emoji: "✨", color: "#FF8280" },
  { id: "membership", label: "Membership", desc: "Your plan & billing", emoji: "👑", color: "#FCE072" },
  { id: "who-wants-to-read", label: "Who Wants to Read", desc: "Actors ready to rehearse with you", emoji: "❤️", color: "#FF8280" },
  { id: "favorites", label: "Favorites", desc: "Your saved scene partners", emoji: "⭐", color: "#FCE072" },
  { id: "leaderboard", label: "Ranks", desc: "See where you rank this season", emoji: "🏆", color: "#FCE072" },
  { id: "dash-profile", label: "Edit Profile", desc: "Update your headshot, bio & info", emoji: "👤", color: "#A7ECDA" },
  { id: "referral", label: "Invite Friends", desc: "Earn tokens by inviting actors", emoji: "🎁", color: "#A7ECDA" },
  { id: "marketplace", label: "Reader Market", desc: "Book paid scene partners", emoji: "💰", color: "#FCE072" },
  { id: "self-tapes", label: "Self-Tapes", desc: "Record and submit auditions", emoji: "📹", color: "#FFB49A" },
  { id: "whats-new", label: "What's New", desc: "See the latest features and updates", emoji: "🆕", color: "#A7ECDA" },
  { id: "report-problem", label: "Report a Problem", desc: "Something not working? Tell us", emoji: "🐞", color: "#FF8280" },
];

const PANEL_COMPONENTS = {
  "find-a-reader": FindAReader,
  "green-room": GreenRoom,
  "cd-sim": CDSim,
  "jericho": Jericho,
  "craft-journey": CraftJourney,
  "leaderboard": Leaderboard,
  "scripts": Scripts,
  "submissions": Submissions,
  "reports": Reports,
  "generator": AuditionGenerator,
  "membership": Membership,
  "dash-profile": DashProfile,
  "who-wants-to-read": WhoWantsToRead,
  "favorites": Favorites,
  "meeting": MeetingRoom,
  "referral": Referral,
  "marketplace": Marketplace,
  "self-tapes": SelfTapesPanel,
  // reader-profile mounts as a bare mobile panel (deep-linked from the Green
  // Room chat header's "View Profile"). It needs a readerId from the
  // drst-navigate detail, which PanelScreen threads in and renders via
  // ReaderProfileWrapper. Registered here so the drst-navigate guard
  // (PANEL_COMPONENTS[targetPanel]) passes instead of silently dropping the tap.
  "reader-profile": ReaderProfile,
};

// Header labels for panels opened only via a teaser / deep-link, so they
// aren't in MORE_FEATURES or TABS (otherwise PanelScreen shows "Feature").
const PANEL_LABELS = {
  "craft-journey": "Craft Journey",
};

/* ═══════════════════════════════════════════════════
   HOME
   ═══════════════════════════════════════════════════ */
/* ── Smart next step for mobile ── */
function getMobileNextStep({ profile, stats, submissions, scripts, firstReviewPending }) {
  const hasHeadshot = profile?.actor_profile?.headshot;
  const hasAuditions = (stats?.total_auditions || 0) > 0;
  const hasSubs = Array.isArray(submissions) && submissions.length > 0;
  const hasScripts = Array.isArray(scripts) && scripts.length > 0;

  // TOP priority: the unclaimed free Tape Review is the activation aha —
  // every other step below is secondary until the user has seen real notes
  // on a real tape. Completion is tracked via tutorial_progress.first_review
  // (server-synced), marked when any Tape Review result lands.
  if (firstReviewPending) {
    return { title: 'Your free Tape Review is waiting', desc: 'Submit one self-tape — get casting-grade notes on your performance in minutes.', cta: 'Claim It', icon: 'sparkle', action: 'first-review' };
  }
  if (!hasHeadshot) {
    return { title: 'Complete your profile', desc: 'Add a headshot so scene partners can find you.', cta: 'Add Headshot', icon: 'community', action: 'profile' };
  }
  if (!hasScripts) {
    return { title: 'Generate your first scene', desc: 'Pick a genre and tone — get custom sides in seconds.', cta: 'Generate', icon: 'sparkle', action: 'generator' };
  }
  if (!hasSubs) {
    return { title: 'Practice with AI', desc: 'Run your scene with an AI partner and record a take.', cta: 'Start Practicing', icon: 'mic', action: 'live' };
  }
  if (!hasAuditions) {
    // Once the user has practiced, push them into the Tracker so they
    // start logging real auditions. Current data: 1 audition logged
    // across 57 users in 7 days — the Tracker needs an active CTA.
    return { title: 'Log your last audition', desc: 'Start your pipeline — Snap a breakdown screenshot or add manually.', cta: 'Add Audition', icon: 'plus', action: 'audition' };
  }
  return { title: 'Ready to work?', desc: 'Jump back into scene study or try the acting coach.', cta: 'Continue', icon: 'play', action: 'live' };
}

// Aurora gamification stack (HUD / quests / streak guard / season pass) —
// hidden from Home: the rank ("#128"), XP and league numbers are fake
// localStorage defaults from gameStore.js, and the stack owned the entire
// first viewport ahead of the real money features. Revive only once the
// numbers are server-backed. Components kept intact on purpose.
const SHOW_AURORA_GAME = false;

// Slate's rotating daily craft notes — the mascot as a gentle guide.
const SLATE_TIPS = [
  'One clean take beats ten rushed ones.',
  'Read the other lines too — listening is the whole game.',
  'Know your first three words cold. The rest follows.',
  'Eyeline just off-lens. Let us see you think.',
  'Tape it, log it, move on. Reps compound.',
  'Specific beats big — pick one real thing to want.',
  'Slate calm. The take starts before “action.”',
];

function HomeScreen({ setTab, setCurrentPanel }) {
  const dispatch = useDispatch();
  const { permission, subscribe, supported, showIOSPrompt, setShowIOSPrompt } = usePushNotifications();
  const { balance, unlimited: tokensUnlimited, refresh: refreshTokens } = useTokenBalance();
  const rawAuditions = useSelector((state) => state.auditions.data || []);
  const rawScripts = useSelector((state) => state.sceneStudyScripts.scripts || []);
  const s = useSelector((state) => state.auditions.stats?.data || {});
  const submissions = useSelector((state) => state.submissions.submissions || []);
  const matchingStats = useSelector((state) => state.readersMatch.matchingStats);
  const isAvailable = useSelector((state) => state.readersMatch.isAvailable);
  const availabilityToggling = useSelector((state) => state.readersMatch.availabilityToggling);
  const profile = useSelector((state) => state.profile?.profile);

  const auditions = rawAuditions.map(mapAudition);
  const scripts = rawScripts.map(mapScript);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorialAchievement, setShowTutorialAchievement] = useState(false);

  // Free-first-review still unclaimed? tutorial_progress.first_review is the
  // server-synced flag TapeReview marks when any review result lands. Gated on
  // settingsLoaded so a returning user never sees a false "free review" flash
  // before their progress arrives.
  const tutorialProgress = useSelector((state) => state.userSettings?.data?.tutorial_progress) || {};
  const settingsLoadedForSteps = useSelector((state) => state.userSettings?.loaded);
  const firstReviewPending = !!settingsLoadedForSteps && !tutorialProgress.first_review;

  const nextStep = getMobileNextStep({ profile, stats: s, submissions, scripts: rawScripts, firstReviewPending });

  // Drop the user into the Tape Review tab with the first-review flow active —
  // the exact handoff AuroraOnboarding's offer step uses (sessionStorage flag
  // survives the AI-consent remount; the event covers the immediate case).
  const launchFreeReview = () => {
    try { window.sessionStorage.setItem('dst_first_review', '1'); } catch { /* noop */ }
    try { window.dispatchEvent(new CustomEvent('drst-start-first-review')); } catch { /* noop */ }
  };

  useEffect(() => {
    const handler = () => setShowTutorialAchievement(true);
    window.addEventListener('drst-tutorial-complete', handler);
    return () => window.removeEventListener('drst-tutorial-complete', handler);
  }, []);

  // Server-synced onboarding flag — follows the user across devices.
  const onboardingSeen = useSelector((state) => state.userSettings?.data?.reader_onboarding_seen);
  const settingsLoaded = useSelector((state) => state.userSettings?.loaded);

  // Pull the snapshot used by the Home graph + cards. Re-fires when
  // the app comes back to the foreground (visibilitychange / focus) so
  // a returning user picks up auditions / submissions added on web or
  // from another device. Debounced so flipping focus rapidly during
  // app-switch (which iOS does multiple times in <1s) doesn't fan out
  // into 15 concurrent thunks racing each other.
  useEffect(() => {
    const refresh = () => {
      dispatch(fetchAuditionsThunk());
      dispatch(fetchAuditionStatsThunk());
      dispatch(getScripts());
      dispatch(fetchSubmissionsThunk());
      dispatch(fetchMatchingStats());
      // Re-sync the AI token balance so the Home card matches server truth
      // after an AI charge (e.g. returning from a Jericho / Tape Review flow).
      // Rides the same debounced visibility/focus trigger — no extra polling.
      refreshTokens?.();
    };
    refresh();
    let pending = null;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => { pending = null; refresh(); }, 400);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      if (pending) clearTimeout(pending);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [dispatch, refreshTokens]);

  useEffect(() => {
    // Wait until server settings have loaded before deciding whether to
    // show onboarding — otherwise a returning user might see it briefly.
    // 300ms (was 2000ms): just enough to let the Home paint settle — a new
    // user staring at an unexplained dashboard for 2s reads as broken.
    if (settingsLoaded && !onboardingSeen) {
      const timer = setTimeout(() => setShowOnboarding(true), 300);
      return () => clearTimeout(timer);
    }
  }, [settingsLoaded, onboardingSeen]);

  // Celebrate a new booking — fire the Aurora celebration when the booked-
  // audition count ticks up. Skips the initial load AND the empty loading
  // state so a transient data refresh can't false-fire. Purely observational.
  const bookedAuditionCount = auditions.filter((a) => a.status === 'booked').length;
  const prevBookedRef = useRef(null);
  useEffect(() => {
    if (!auditions.length) return;
    if (prevBookedRef.current === null) { prevBookedRef.current = bookedAuditionCount; return; }
    if (bookedAuditionCount > prevBookedRef.current) {
      auroraCelebrate('reward', { title: 'You booked it! 🎬', message: 'A new role just landed in your tracker.' });
    }
    prevBookedRef.current = bookedAuditionCount;
  }, [bookedAuditionCount, auditions.length]);

  const hasStats = (s.total_auditions || 0) > 0 || (s.total_booked || 0) > 0;
  const callbacks = auditions.filter(a => callbackBadge(a.callbackDate));
  const firstName = profile?.first_name || '';
  const hour = new Date().getHours();
  const greeting = firstName
    ? (hour < 12 ? `Good morning, ${firstName}` : hour < 17 ? `Hey ${firstName}` : `Working late, ${firstName}?`)
    : (hour < 12 ? 'Good morning' : hour < 17 ? "Hey, what's up" : 'Working late');

  const handleNextStep = () => {
    // 'profile' action routes to the DashProfile edit form panel.
    // PANEL_COMPONENTS uses the id 'dash-profile' for this; using 'profile'
    // here previously rendered nothing because no PANEL_COMPONENTS entry
    // matched.
    if (nextStep.action === 'profile') setCurrentPanel('dash-profile');
    else if (nextStep.action === 'generator') setCurrentPanel('generator');
    else if (nextStep.action === 'live') setTab('scenes');
    else if (nextStep.action === 'audition') setTab('auditions');
    else if (nextStep.action === 'first-review') launchFreeReview();
  };

  const firstCallback = callbacks[0];

  // ── Tape Review highlight — the hero feature. Permanent position 1 on
  // Home for everyone: free-offer copy + first-review handoff while the
  // free review is unclaimed, standard copy + tab handoff afterwards.
  const tapeReviewHero = (
    <button
      type="button"
      onClick={() => (firstReviewPending ? launchFreeReview() : setTab('tape-review'))}
      style={{
        width: '100%', marginBottom: 14, padding: 0, cursor: 'pointer',
        borderRadius: 20, border: '1px solid rgba(212,168,95,0.45)', overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(120deg, #1A1305 0%, #3A2A0E 45%, #7A5A18 100%)',
        boxShadow: '0 12px 30px rgba(122,90,24,0.28)',
        height: 132, display: 'block', textAlign: 'left',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 100% 0%, rgba(212,168,95,0.38), transparent 60%)' }} />
      <div style={{ position: 'absolute', left: 18, top: 0, bottom: 0, right: 92, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span className="aurora-eyebrow" style={{ color: '#FCE072' }}>
          {firstReviewPending ? '✨ FREE · AI TAPE REVIEW' : '✨ NEW · AI TAPE REVIEW'}
        </span>
        <div className="aurora-display" style={{ fontSize: 19, color: '#FFF', letterSpacing: '-0.4px', lineHeight: 1.12, marginTop: 5 }}>
          {firstReviewPending ? 'Your first review is free →' : 'Casting-grade notes on your self-tape →'}
        </div>
        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.72)', marginTop: 6, fontWeight: 500 }}>
          Submit a take · notes in seconds
        </span>
      </div>
      <div style={{ position: 'absolute', right: 18, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🎥</div>
      </div>
    </button>
  );

  return (
    <div className="aurora-orbs aurora-orbs-live" style={{ padding: "0 20px 32px", minHeight: '100%' }}>
      {showOnboarding && <AuroraOnboarding onClose={() => setShowOnboarding(false)} />}
      {showTutorialAchievement && <TutorialAchievement show onClose={() => setShowTutorialAchievement(false)} />}

      {/* Pending likes banner */}
      <div style={{ paddingTop: 16, marginBottom: (matchingStats?.pending_likes_count || 0) > 0 ? 8 : 0 }}>
        <PendingLikesBanner onNavigate={() => setTab("find-a-reader")} />
      </div>

      {/* Profile completeness — auto-hides at 100% */}
      <div style={{ paddingTop: 8 }}>
        <ProfileCompleteness onTapMissing={() => setCurrentPanel('dash-profile')} />
      </div>

      {/* ── Greeting block ── */}
      <div style={{ padding: '24px 0 22px' }}>
        <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 6 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
        </span>
        <h1 className="aurora-display" style={{
          fontSize: 30, color: 'var(--aurora-text)', margin: 0,
          letterSpacing: '-0.7px', lineHeight: 1.15,
        }}>
          {greeting} <span style={{ color: 'var(--aurora-heritage-gold)' }}>✦</span>
        </h1>
      </div>

      {/* ── Tape Review hero — permanent position 1 (free-offer copy while
           the first review is unclaimed, standard copy after) ── */}
      {tapeReviewHero}

      {/* ── AI scene partner CTA — position 2. Routes to the actual live
           reader (Scenes tab → pick sides → Go Live), the same path the
           Smart Next Step 'live' action uses. It used to open cd-sim, which
           is coaching notes, not a scene partner — a lying CTA. ── */}
      <button
        type="button"
        onClick={() => setTab('scenes')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 18px', marginBottom: 14, cursor: 'pointer',
          textAlign: 'left', borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(10,10,10,0.95), rgba(30,28,22,0.95))',
          border: '1px solid rgba(212,168,95,0.32)',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 12px 28px rgba(10,10,10,0.28)',
        }}
      >
        <div
          style={{
            position: 'absolute', top: -40, right: -40, width: 180, height: 180,
            background: 'radial-gradient(circle, rgba(212,168,95,0.45), transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #F0D097, #D4A85F)',
            border: '1px solid rgba(255,255,255,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1A1408',
            boxShadow: '0 6px 18px rgba(212,168,95,0.45)',
            flexShrink: 0,
          }}
        >
          <Icon name="play" size={22} color="#1A1408" />
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <span
            className="aurora-eyebrow"
            style={{ display: 'block', color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}
          >
            AI SCENE PARTNER
          </span>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
            Rehearse with an AI scene partner
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)', margin: '2px 0 0' }}>
            Load your sides · run the scene out loud
          </p>
        </div>
      </button>

      {/* ── Aurora gamification: progress HUD + daily quests + Pilot Season ──
           Gated off — fake localStorage rank; revive only server-backed
           (see SHOW_AURORA_GAME above). */}
      {SHOW_AURORA_GAME && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
          <AuroraHUD />
          <AuroraQuests />
          <AuroraStreakGuard />
          <AuroraSeason />
        </div>
      )}

      {/* Slate's daily note */}
      <div style={{ marginBottom: 18 }}>
        <SlateTip>{SLATE_TIPS[(new Date().getDate() - 1) % SLATE_TIPS.length]}</SlateTip>
      </div>

      {/* ── Smart Next Step CTA ── */}
      <button
        onClick={handleNextStep}
        className="aurora-card"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "16px 18px", cursor: "pointer", textAlign: "left",
          marginBottom: 18, color: 'var(--aurora-text)',
          border: 'none',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: "color-mix(in oklch, var(--aurora-accent) 18%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon name={nextStep.icon} size={22} color={CORAL} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--aurora-text)', margin: 0 }}>{nextStep.title}</p>
          <p style={{ fontSize: 12, color: 'var(--aurora-sub)', margin: "3px 0 0", lineHeight: 1.3 }}>{nextStep.desc}</p>
        </div>
        <span className="aurora-micro" style={{
          fontSize: 11, fontWeight: 700, color: "#fff",
          background: 'var(--aurora-accent)', padding: "8px 14px", borderRadius: 100,
          whiteSpace: "nowrap", flexShrink: 0,
          boxShadow: 'var(--aurora-shadow-coral)',
        }}>
          {nextStep.cta}
        </span>
      </button>

      {/* ── Callback card (Aurora gold gradient) ── */}
      {firstCallback && (
        <button
          onClick={() => setTab('auditions')}
          style={{
            width: '100%', display: 'block', textAlign: 'left', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--aurora-heritage-gold), var(--aurora-heritage-gold-light))',
            borderRadius: 24, padding: '20px 22px', marginBottom: 14,
            border: 'none', position: 'relative', overflow: 'hidden',
            boxShadow: '0 12px 30px rgba(212,168,95,0.30)',
          }}
        >
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 180, height: 180,
            background: 'radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="aurora-micro" style={{ color: 'var(--aurora-heritage-gold-deep)' }}>NEXT CALLBACK</span>
            <span className="aurora-mono" style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 100,
              background: 'rgba(10,10,10,0.85)', color: '#fff',
            }}>
              {callbackBadge(firstCallback.callbackDate)?.text?.toUpperCase()}
            </span>
          </div>
          <div className="aurora-display" style={{ fontSize: 22, color: '#0E0D0A', lineHeight: 1.2, marginBottom: 4 }}>
            {firstCallback.project} — {firstCallback.character}
          </div>
          <div className="aurora-micro" style={{ color: 'var(--aurora-heritage-gold-deep)', marginTop: 8 }}>
            {firstCallback.cd}
          </div>
        </button>
      )}

      {/* ── Practice strip ── */}
      <AuroraPracticeStrip />

      {/* ── Pipeline blocks ── only render when there's data. The "log
           your first audition" empty state used to live here but was
           redundant — the Smart Next Step banner and the Get Started
           tutorial checklist below already prompt the same action. */}
      {hasStats && <AuroraPipeline stats={s} auditions={auditions} setTab={setTab} />}

      {/* ── Community Leaderboard teaser ── */}
      <button
        type="button"
        onClick={() => setCurrentPanel('leaderboard')}
        style={{
          width: '100%',
          marginBottom: 14,
          padding: 0,
          cursor: 'pointer',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.5)',
          overflow: 'hidden',
          position: 'relative',
          background: '#0E0D0A url(/photos/audition-hall-hamlet.png) center 30%/cover',
          boxShadow: '0 10px 28px rgba(20,18,14,0.18)',
          height: 116,
          display: 'block',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(110deg, rgba(14,13,10,0.55), transparent 60%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 0,
            bottom: 0,
            right: 96,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span
            className="aurora-eyebrow"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            COMMUNITY LEADERBOARD
          </span>
          <div
            className="aurora-display"
            style={{
              fontSize: 18,
              color: '#FFF',
              letterSpacing: '-0.4px',
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            See where you rank this season →
          </div>
        </div>
      </button>

      {/* ── Craft Journey teaser ── */}
      <button
        type="button"
        onClick={() => setCurrentPanel('craft-journey')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 18px',
          marginBottom: 14,
          cursor: 'pointer',
          textAlign: 'left',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(167,214,255,0.45) 0%, rgba(159,230,180,0.45) 100%)',
          border: '1px solid rgba(255,255,255,0.55)',
          boxShadow: '0 8px 22px rgba(159,230,180,0.18)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #A7D6FF, #9FE6B4)',
            border: '1px solid rgba(255,255,255,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0E0D0A', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(159,230,180,0.40)',
          }}
        >
          <Icon name="sparkle" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            className="aurora-eyebrow"
            style={{ display: 'block', color: 'var(--aurora-heritage-gold-deep)', marginBottom: 2 }}
          >
            CRAFT JOURNEY
          </span>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0E0D0A', margin: 0 }}>
            Up next: <span style={{ color: 'var(--aurora-heritage-gold-deep)' }}>Anger Work</span>
          </p>
        </div>
        <span
          className="aurora-micro"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#0E0D0A',
            background: 'rgba(255,255,255,0.7)',
            padding: '6px 12px',
            borderRadius: 100,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            backdropFilter: 'blur(8px)',
          }}
        >
          OPEN →
        </span>
      </button>

      {/* ── Match tease ── 3 stacked reader avatars + "X new readers near you" ── */}
      {(() => {
        const recent = Array.isArray(matchingStats?.recent_readers) ? matchingStats.recent_readers : [];
        const readers = recent.slice(0, 3);
        const count = Number(matchingStats?.pending_likes_count) || Number(matchingStats?.available_count) || 0;
        if (count === 0 && readers.length === 0) return null;
        return (
          <button
            type="button"
            onClick={() => setTab('find-a-reader')}
            className="aurora-card"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', marginBottom: 14, cursor: 'pointer',
              textAlign: 'left', border: 'none',
            }}
          >
            <div style={{ position: 'relative', width: 64, height: 36, flexShrink: 0 }}>
              {[0, 1, 2].map((i) => {
                const r = readers[i];
                const initials = r?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '·';
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: i * 16,
                      width: 36, height: 36, borderRadius: '50%',
                      background: r?.headshot ? `url(${r.headshot}) center/cover` : 'linear-gradient(135deg, #D4A85F, #F0D097)',
                      border: '2px solid var(--aurora-surface-solid)',
                      boxShadow: '0 2px 8px rgba(10,10,10,0.10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#0E0D0A', fontSize: 11, fontWeight: 700,
                      zIndex: 3 - i,
                    }}
                  >
                    {!r?.headshot && initials}
                  </div>
                );
              })}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="aurora-eyebrow" style={{ display: 'block', color: 'var(--aurora-dim)', marginBottom: 2 }}>
                FIND A READER
              </span>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--aurora-text)', margin: 0 }}>
                {count} new reader{count !== 1 ? 's' : ''} near you
              </p>
              <p style={{ fontSize: 11, color: 'var(--aurora-sub)', margin: '2px 0 0' }}>
                Swipe to run sides together
              </p>
            </div>
            <span
              className="aurora-mono"
              style={{
                fontSize: 11, fontWeight: 700, color: 'var(--aurora-heritage-gold-deep)',
                letterSpacing: '0.12em',
              }}
            >
              MATCH →
            </span>
          </button>
        );
      })()}

      {/* ── Recent submissions ── 4 rows with colored status bar ── */}
      {submissions && submissions.length > 0 && (
        <div className="aurora-card" style={{ padding: '14px 16px 8px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="aurora-eyebrow" style={{ color: 'var(--aurora-dim)' }}>RECENT</span>
            <button
              onClick={() => setTab('auditions')}
              className="aurora-mono"
              style={{
                background: 'none', border: 'none', color: 'var(--aurora-sub)',
                cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10, letterSpacing: '0.15em',
              }}
            >
              VIEW ALL →
            </button>
          </div>
          {submissions.slice(0, 4).map((sub, i) => {
            const status = sub.status || 'submitted';
            const statusColor = {
              submitted: '#A7D6FF',
              reviewed: '#FFC9A3',
              viewed: '#FFC9A3',
              callback: '#D4A85F',
              booked: '#9FE6B4',
              passed: 'rgba(10,10,10,0.30)',
            }[status] || '#A7D6FF';
            const statusLabel = status.replace('_', ' ').toUpperCase();
            const isLast = i === Math.min(submissions.length, 4) - 1;
            return (
              <div
                key={sub.id || i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: isLast ? 'none' : '1px solid var(--aurora-line-soft)',
                }}
              >
                <div
                  style={{
                    width: 4, height: 28, background: statusColor,
                    borderRadius: 2, boxShadow: `0 0 8px ${statusColor}88`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14, fontWeight: 500, color: 'var(--aurora-text)',
                      letterSpacing: '-0.2px', whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {sub.project_title || sub.project || 'Untitled'}
                  </div>
                  {sub.character && (
                    <div
                      className="aurora-mono"
                      style={{ fontSize: 10, color: 'var(--aurora-dim)', marginTop: 3, letterSpacing: '0.05em' }}
                    >
                      {String(sub.character).toUpperCase()}
                    </div>
                  )}
                </div>
                <span
                  className="aurora-mono"
                  style={{
                    fontSize: 9, color: '#0E0D0A', background: statusColor,
                    padding: '3px 8px', borderRadius: 100, letterSpacing: '0.12em',
                    flexShrink: 0,
                  }}
                >
                  {statusLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Acting Coach (cd-sim) — honest copy: it gives coaching notes on
           a scene, it is not the scene partner (that card lives up top). ── */}
      <button
        type="button"
        onClick={() => setCurrentPanel('cd-sim')}
        onTouchEnd={(e) => { e.preventDefault(); setCurrentPanel('cd-sim'); }}
        className="aurora-card"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 18px', marginBottom: 14, cursor: 'pointer',
          textAlign: 'left', border: 'none', color: 'var(--aurora-text)',
          touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'color-mix(in oklch, var(--aurora-heritage-gold) 22%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}
        >
          🎭
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            className="aurora-eyebrow"
            style={{ display: 'block', color: 'var(--aurora-dim)', marginBottom: 2 }}
          >
            ACTING COACH
          </span>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--aurora-text)', margin: 0 }}>
            Get coaching notes on your scene
          </p>
          <p style={{ fontSize: 11, color: 'var(--aurora-sub)', margin: '2px 0 0' }}>
            Upload sides · expert feedback on your read
          </p>
        </div>
        <span
          className="aurora-mono"
          style={{ fontSize: 11, fontWeight: 700, color: 'var(--aurora-heritage-gold-deep)', letterSpacing: '0.12em' }}
        >
          OPEN →
        </span>
      </button>

      {/* ── Tutorial + daily challenge — kept; Aurora glass treatment via wrapper ── */}
      <div style={{ marginBottom: 14 }}>
        <DailyChallengeCard />
      </div>
      <div style={{ marginBottom: 14 }}>
        <TutorialChecklist onNavigate={({ tab, panel }) => {
          if (tab) { setTab(tab); }
          if (panel) { setCurrentPanel(panel); }
        }} />
      </div>

      {/* ── Availability toggle ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => !availabilityToggling && dispatch(toggleAvailability(!isAvailable))}
          className="aurora-card"
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            padding: "12px 16px", cursor: "pointer", border: 'none',
            background: isAvailable ? 'color-mix(in oklch, var(--aurora-mint) 16%, var(--aurora-surface-solid))' : 'var(--aurora-surface-solid)',
            color: 'var(--aurora-text)',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isAvailable ? 'var(--aurora-mint)' : 'var(--aurora-dim)',
            boxShadow: isAvailable ? '0 0 8px var(--aurora-mint)' : 'none',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: isAvailable ? 'var(--aurora-mint)' : 'var(--aurora-sub)' }}>
            {isAvailable ? "Available for readers" : "Go available"}
          </span>
        </button>

        {(matchingStats?.pending_likes_count || 0) > 0 && (
          <button
            onClick={() => setTab("find-a-reader")}
            className="aurora-card"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 16px", cursor: "pointer", border: 'none',
              color: 'var(--aurora-text)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {matchingStats.pending_likes_count} matches
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--aurora-accent)' }}>View →</span>
          </button>
        )}
      </div>

      {/* ── Token balance — tappable → membership panel (Home's only
           proactive paywall entry; it used to be a dead <div>). Tap-belt
           applied per the iOS WKWebView synthetic-click gotcha. ── */}
      {balance !== null && (
        <button
          type="button"
          onClick={() => setCurrentPanel('membership')}
          onTouchEnd={(e) => { e.preventDefault(); setCurrentPanel('membership'); }}
          className="aurora-card"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '12px 16px',
            border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--aurora-text)',
            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 16 }}>🎟️</span>
          <div style={{ flex: 1 }}>
            {tokensUnlimited ? (
              <span className="aurora-mono" style={{ fontSize: 13, color: 'var(--aurora-mint)' }}>Unlimited AI</span>
            ) : (
              <>
                <span className="aurora-mono" style={{ fontSize: 13, color: 'var(--aurora-mint)' }}>{balance}</span>
                <span style={{ fontSize: 12, color: 'var(--aurora-sub)' }}> AI tokens remaining</span>
              </>
            )}
          </div>
          {/* Upgrade chip from 3 tokens down — at 0 the wall already hit;
              ≤3 is where the next AI action is at risk. */}
          {!tokensUnlimited && balance <= 3 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#fff',
              background: 'var(--aurora-accent)', padding: '4px 10px', borderRadius: 100,
            }}>
              Upgrade
            </span>
          )}
        </button>
      )}

      {/* ── Recent Scripts ── */}
      {scripts.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="aurora-eyebrow">CONTINUE PRACTICING</span>
            <button onClick={() => setTab("scenes")} className="aurora-micro" style={{
              background: "none", border: "none", color: 'var(--aurora-sub)', cursor: "pointer",
            }}>ALL SCRIPTS →</button>
          </div>
          {scripts.slice(0, 2).map(sc => (
            <div
              key={sc.id}
              onClick={() => setTab("scenes")}
              className="aurora-card"
              style={{
                padding: "14px 16px", marginBottom: 10,
                display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
              }}
            >
              <ProgressRing pct={sc.progress} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--aurora-text)', margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title}</p>
                <p style={{ fontSize: 12, color: 'var(--aurora-sub)', margin: "2px 0 0" }}>{sc.pages}{sc.lastPracticed ? ` · ${sc.lastPracticed}` : ""}</p>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'color-mix(in oklch, var(--aurora-accent) 18%, transparent)',
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="play" size={16} color={CORAL} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── V1FAB radial quick-actions ──
           First action is the money feature. The old "Record take" → cd-sim
           was a lying label twice over: there is no in-app recorder yet
           (SelfTapesPanel is upload-only) and cd-sim isn't a camera. */}
      <V1FAB
        actions={[
          {
            k: 'notes',
            label: 'Get tape notes',
            short: 'NOTES',
            color: '#D4A85F',
            icon: <Icon name="tape" size={16} />,
            onClick: () => setTab('tape-review'),
          },
          {
            k: 'aud',
            label: 'Log audition',
            short: 'LOG',
            color: '#A7D6FF',
            icon: <Icon name="target" size={16} />,
            onClick: () => setTab('auditions'),
          },
          {
            k: 'find',
            label: 'Find reader',
            short: 'FIND',
            color: '#FFC9A3',
            icon: <Icon name="community" size={16} />,
            onClick: () => setTab('find-a-reader'),
          },
          {
            k: 'script',
            label: 'Upload script',
            short: 'SCRIPT',
            color: '#9FE6B4',
            icon: <Icon name="sparkle" size={16} />,
            onClick: () => setCurrentPanel('scripts'),
          },
        ]}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   AUDITIONS
   ═══════════════════════════════════════════════════ */
function AuditionsScreen() {
  const dispatch = useDispatch();
  const rawAuditions = useSelector((state) => state.auditions.data || []);
  const submissions = useSelector((state) => state.submissions.submissions || []);
  const auditions = rawAuditions.map(mapAudition);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [viewSection, setViewSection] = useState("tracker");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ project: '', role: '', casting_director: '', project_type: 'film', callback_date: '', notes: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const scanInputRef = useRef(null);

  const handleScanScreenshot = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await axiosInstance.post(endPoints.parseBreakdown, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const parsed = res.data?.data || {};
      setAddForm(prev => ({
        ...prev,
        project: parsed.project || prev.project,
        role: parsed.role || prev.role,
        casting_director: parsed.casting_director || prev.casting_director,
        project_type: parsed.project_type || prev.project_type,
        notes: parsed.notes || prev.notes,
      }));
      try { const { trackEvent, Events } = await import('../../utils/analytics'); trackEvent(Events.SCAN_SCREENSHOT, { fields_extracted: Object.keys(parsed).length }); } catch { /* swallow */ }
    } catch (err) {
      console.error('Failed to parse screenshot:', err);
    }
    setScanLoading(false);
    if (scanInputRef.current) scanInputRef.current.value = '';
  };

  useEffect(() => {
    dispatch(fetchAuditionsThunk());
    dispatch(fetchSubmissionsThunk());
  }, [dispatch]);

  const handleAddAudition = async (e) => {
    e.preventDefault();
    if (!addForm.project.trim()) return;
    setAddSaving(true);
    try {
      // Clean empty fields so backend doesn't choke on empty strings
      const payload = { ...addForm };
      if (!payload.callback_date) delete payload.callback_date;
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
      payload.project = addForm.project; // always include project

      await dispatch(createAuditionThunk(payload)).unwrap();
      dispatch(fetchAuditionsThunk());
      dispatch(fetchAuditionStatsThunk());
      try { const { trackEvent, Events } = await import('../../utils/analytics'); trackEvent(Events.ADD_AUDITION, { type: payload.project_type, has_callback: !!payload.callback_date }); } catch { /* swallow */ }
      // Mark tutorial step
      markStep('track_audition');
      setAddForm({ project: '', role: '', casting_director: '', project_type: 'film', callback_date: '', notes: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add audition:', err);
      alert(typeof err === 'string' ? err : 'Failed to add audition. Please try again.');
    }
    setAddSaving(false);
  };

  const filtered = filter === "all" ? auditions : auditions.filter(a => a.type === filter);
  const columns = [
    { id: "submitted", label: "Submitted" },
    { id: "in_review", label: "In review" },
    { id: "audition", label: "Audition" },
    { id: "callback", label: "Callback" },
    { id: "booked", label: "Booked" },
    { id: "passed", label: "Passed" },
  ];
  const types = [
    { key: "all", label: "All" },
    { key: "film", label: "Film" },
    { key: "commercial", label: "Comm." },
    { key: "theatrical", label: "Theater" },
    { key: "voiceover", label: "VO" },
  ];

  return (
    <div className="aurora-orbs aurora-orbs-live" style={{ padding: "0 16px 24px", minHeight: '100%' }}>
      <div style={{ padding: "20px 0 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 4 }}>AUDITION TRACKER</span>
          <h1 className="aurora-display" style={{ fontSize: 26, color: 'var(--aurora-text)', margin: 0, letterSpacing: '-0.6px' }}>
            <span className="aurora-mono" style={{ fontSize: 26 }}>{auditions.length}</span>{' '}
            <span style={{ fontSize: 20, color: 'var(--aurora-sub)', fontWeight: 500 }}>submissions</span>
          </h1>
        </div>
        <button onClick={() => setShowAddForm(true)} style={{
          width: 42, height: 42, borderRadius: 14,
          background: `linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))`,
          border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          boxShadow: 'var(--aurora-shadow-coral)',
        }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      </div>

      {/* Submissions metric ring — moved here from Home, scaled down so it
          reads as a compact tracker summary rather than a hero. */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: -44 }}>
          <V1HeroGraph data={buildHeroData(auditions)} onSubmitFirst={() => setShowAddForm(true)} />
        </div>
      </div>

      {/* Add Audition Modal — portaled to <body> so it escapes the
          aurora-orbs `isolation: isolate` stacking context, which was
          letting the z-50 top bar render over the modal's X button. */}
      {showAddForm && createPortal(
        <div
          onClick={() => setShowAddForm(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(10,10,10,0.45)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            // Leave room at the bottom for the tab bar + home indicator
            // so the modal's submit button isn't hidden behind them.
            padding: "16px 16px calc(96px + env(safe-area-inset-bottom, 0px)) 16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
            background: 'var(--aurora-surface-solid)',
            borderRadius: 24,
            border: '1px solid var(--aurora-line)',
            // 100dvh tracks the live viewport on iOS (vh doesn't shrink
            // when the URL bar is showing). Same calc as the wrapper
            // so the modal never extends behind the bottom tab bar.
            width: "100%", maxWidth: 400,
            maxHeight: "calc(100dvh - 112px - env(safe-area-inset-bottom, 0px))",
            overflow: "auto",
            // Stop the modal's internal scroll from chaining to the
            // body — that was causing the "snap back up" bounce on iOS.
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            padding: 24,
            boxShadow: 'var(--aurora-shadow-modal)',
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="aurora-display" style={{ fontSize: 20, color: 'var(--aurora-text)', margin: 0, letterSpacing: '-0.3px' }}>Add Audition</h2>
              <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", color: 'var(--aurora-dim)', fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {/* Scan Screenshot Button */}
            <button
              type="button"
              onClick={() => scanInputRef.current?.click()}
              disabled={scanLoading}
              style={{
                width: "100%", padding: "14px", borderRadius: 14, cursor: "pointer",
                background: "color-mix(in oklch, var(--aurora-accent) 8%, var(--aurora-surface-solid))",
                border: `1.5px dashed color-mix(in oklch, var(--aurora-accent) 40%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                marginBottom: 20, transition: "all 0.2s",
              }}
            >
              {scanLoading ? (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--aurora-accent-deep)' }}>Scanning with AI...</span>
              ) : (
                <>
                  <span style={{ fontSize: 18 }}>📸</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--aurora-text)' }}>Scan Screenshot with AI</span>
                </>
              )}
            </button>
            <input ref={scanInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleScanScreenshot} />

            <form onSubmit={handleAddAudition}>
              {[
                { key: "project", label: "Project Name *", placeholder: "e.g. Untitled Netflix Drama" },
                { key: "role", label: "Role / Character", placeholder: "e.g. Lead — Sarah" },
                { key: "casting_director", label: "Casting Director", placeholder: "e.g. Jane Smith Casting" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--aurora-sub)', display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input
                    value={addForm[f.key]}
                    onChange={(e) => setAddForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: `1px solid var(--aurora-line)`, background: 'var(--aurora-surface-solid)', color: 'var(--aurora-text)', fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--aurora-sub)', display: "block", marginBottom: 6 }}>Project Type</label>
                <select
                  value={addForm.project_type}
                  onChange={(e) => setAddForm(prev => ({ ...prev, project_type: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: `1px solid var(--aurora-line)`, background: 'var(--aurora-surface-solid)', color: 'var(--aurora-text)', fontSize: 14, outline: "none" }}
                >
                  {[["film","Film/TV"],["commercial","Commercial"],["theatrical","Theatrical"],["voiceover","Voiceover"],["theater","Theater"]].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--aurora-sub)', display: "block", marginBottom: 6 }}>Callback Date</label>
                <input
                  type="date"
                  value={addForm.callback_date}
                  onChange={(e) => setAddForm(prev => ({ ...prev, callback_date: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: `1px solid var(--aurora-line)`, background: 'var(--aurora-surface-solid)', color: 'var(--aurora-text)', fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--aurora-sub)', display: "block", marginBottom: 6 }}>Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any additional details..."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: `1px solid var(--aurora-line)`, background: 'var(--aurora-surface-solid)', color: 'var(--aurora-text)', fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }}
                />
              </div>
              <button
                type="submit"
                disabled={addSaving || !addForm.project.trim()}
                style={{
                  width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
                  background: `linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))`, color: "#fff",
                  boxShadow: 'var(--aurora-shadow-coral)',
                  fontSize: 15, fontWeight: 700, opacity: addSaving || !addForm.project.trim() ? 0.5 : 1,
                }}
              >
                {addSaving ? "Saving..." : "Add Audition"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Tab row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: `1px solid var(--aurora-line)`, paddingBottom: 12 }}>
        {[{ key: "tracker", label: "Tracker" }, { key: "submissions", label: "Submissions" }].map(sec => (
          <button key={sec.key} onClick={() => setViewSection(sec.key)} className="aurora-mono" style={{
            padding: "6px 16px", borderRadius: 100, border: "none", cursor: "pointer",
            fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: viewSection === sec.key ? 'var(--aurora-text)' : "transparent",
            color: viewSection === sec.key ? 'var(--aurora-bg)' : 'var(--aurora-dim)',
            transition: 'all 0.2s',
          }}>
            {sec.label}
          </button>
        ))}
      </div>

      {/* Pipeline Stats Bar */}
      {viewSection === "tracker" && auditions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {/* Mini bar chart */}
          <div style={{ display: "flex", gap: 2, height: 32, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
            {columns.map(col => {
              const count = auditions.filter(a => a.status === col.id).length;
              const pct = auditions.length > 0 ? (count / auditions.length) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div key={col.id} style={{
                  flex: `0 0 ${Math.max(pct, 8)}%`,
                  background: STATUS_COLORS[col.id] || TEXT_MUTED,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.3s",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{count}</span>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {columns.map(col => {
              const count = auditions.filter(a => a.status === col.id).length;
              if (count === 0) return null;
              return (
                <div key={col.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[col.id] }} />
                  <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>{col.label} ({count})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewSection === "submissions" ? (
        <div>
          {submissions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: 'var(--aurora-dim)', fontSize: 13 }}>No submissions yet — start tracking your work.</div>
          ) : submissions.map(sub => {
            const auroraColor = { sent: 'var(--aurora-sky)', viewed: 'var(--aurora-purple)', callback: 'var(--aurora-heritage-gold)', booked: 'var(--aurora-mint)' }[sub.status] || 'var(--aurora-dim)';
            return (
              <div key={sub.id} className="aurora-glass" style={{ padding: "16px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--aurora-text)', margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{sub.project_name || "Untitled"}</p>
                  <span className="aurora-mono" style={{
                    fontSize: 10, padding: "3px 10px", borderRadius: 100, marginLeft: 8,
                    background: auroraColor, color: '#0A0A0A',
                    textTransform: "uppercase", whiteSpace: "nowrap", letterSpacing: '0.08em',
                  }}>{sub.status || "sent"}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--aurora-sub)', margin: "0 0 10px" }}>
                  {sub.role || ""}{sub.casting_director ? ` · ${sub.casting_director}` : ""}
                </p>
                <button onClick={async () => {
                  try {
                    await dispatch(promoteToAuditionThunk({ id: sub.id })).unwrap();
                    dispatch(fetchAuditionsThunk());
                    dispatch(fetchAuditionStatsThunk());
                  } catch {}
                }} className="aurora-mono" style={{
                  background: 'color-mix(in oklch, var(--aurora-heritage-gold) 18%, transparent)',
                  border: '1px solid color-mix(in oklch, var(--aurora-heritage-gold) 35%, transparent)',
                  borderRadius: 100,
                  padding: "8px 14px", cursor: "pointer", fontSize: 11, fontWeight: 600,
                  color: 'var(--aurora-heritage-gold-deep)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', width: "100%",
                }}>
                  🎬  I GOT AN AUDITION
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <>
      {/* Filter Pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {types.map(t => {
          const count = t.key === "all" ? auditions.length : auditions.filter(a => a.type === t.key).length;
          const active = filter === t.key;
          return (
            <button key={t.key} onClick={() => setFilter(t.key)} className="aurora-mono" style={{
              padding: "7px 14px", borderRadius: 100, cursor: "pointer", whiteSpace: "nowrap",
              fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase',
              background: active ? 'var(--aurora-text)' : 'var(--aurora-glass)',
              color: active ? 'var(--aurora-bg)' : 'var(--aurora-sub)',
              border: active ? 'none' : '1px solid var(--aurora-glass-border)',
              backdropFilter: active ? 'none' : 'blur(12px)',
              transition: "all 0.2s",
            }}>
              {t.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Compact List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: TEXT_MUTED, fontSize: 13 }}>
          No auditions yet — tap + to add one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(a => {
            const cb = callbackBadge(a.callbackDate);
            const statusColor = STATUS_COLORS[a.status] || TEXT_MUTED;
            const statusLabel = columns.find(c => c.id === a.status)?.label || a.status;
            const isCallback = a.status === 'callback' || a.status === 'audition';
            return (
              <div
                key={a.id}
                onClick={() => setSelected(a)}
                className="aurora-glass"
                style={{
                  padding: "14px 16px", cursor: "pointer",
                  border: cb?.urgent
                    ? `1px solid color-mix(in oklch, var(--aurora-accent) 40%, transparent)`
                    : `1px solid var(--aurora-glass-border)`,
                  boxShadow: cb?.urgent ? 'var(--aurora-shadow-coral)' : 'var(--aurora-shadow-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--aurora-text)', margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{a.project}</p>
                  <span className="aurora-mono" style={{
                    fontSize: 10, padding: "3px 10px", borderRadius: 100,
                    background: statusColor, color: '#0A0A0A', textTransform: 'uppercase',
                    letterSpacing: '0.08em', marginLeft: 8, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>{statusLabel}</span>
                </div>
                {a.character && (
                  <p style={{ fontSize: 13, color: 'var(--aurora-sub)', margin: "0 0 4px" }}>{a.character}</p>
                )}
                <div className="aurora-micro" style={{ color: 'var(--aurora-dim)' }}>
                  {[a.cd, a.type?.toUpperCase()].filter(Boolean).join(' · ')}
                </div>
                {cb && isCallback && (
                  <div style={{
                    marginTop: 10, padding: "6px 12px", borderRadius: 10,
                    background: 'color-mix(in oklch, var(--aurora-heritage-gold) 20%, transparent)',
                    border: '1px solid color-mix(in oklch, var(--aurora-heritage-gold) 30%, transparent)',
                    display: 'inline-block',
                  }}>
                    <span className="aurora-micro" style={{ color: 'var(--aurora-heritage-gold-deep)' }}>
                      CALLBACK · {cb.text.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet Detail */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <div onClick={() => setSelected(null)} style={{
            position: "absolute", inset: 0,
            background: "rgba(10,10,10,0.5)",
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            zIndex: 0,
          }} />
          {/* Sheet */}
          <div style={{
            position: "relative", zIndex: 1, maxHeight: "85vh",
            background: 'var(--aurora-glass-strong)',
            backdropFilter: 'blur(40px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
            border: '1px solid var(--aurora-glass-border)',
            borderRadius: "28px 28px 0 0",
            padding: "12px 22px calc(80px + env(safe-area-inset-bottom, 0px))",
            overflowY: "scroll", WebkitOverflowScrolling: "touch",
            boxShadow: 'var(--aurora-shadow-modal)',
          }}>
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--aurora-line)" }} />
            </div>
            <button onClick={() => setSelected(null)} style={{
              position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 100,
              background: 'var(--aurora-glass)', border: '1px solid var(--aurora-glass-border)',
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              color: 'var(--aurora-sub)', fontSize: 18, lineHeight: 1,
              backdropFilter: 'blur(12px)',
            }}>×</button>

            {/* Header */}
            <div style={{ marginBottom: 22, paddingRight: 40 }}>
              <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 6 }}>
                {(selected.type || 'AUDITION').toUpperCase()}
                {selected.agency ? ` · ${selected.agency.toUpperCase()}` : ''}
              </span>
              <h2 className="aurora-display" style={{ fontSize: 26, color: 'var(--aurora-text)', margin: 0, letterSpacing: '-0.6px' }}>
                {selected.project}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--aurora-sub)', margin: "4px 0 0" }}>
                as {selected.character || '—'}
              </p>
              <span className="aurora-mono" style={{
                display: "inline-block", marginTop: 10,
                fontSize: 11, padding: "4px 12px", borderRadius: 100,
                background: STATUS_COLORS[selected.status] || 'var(--aurora-line)',
                color: '#0A0A0A', textTransform: "uppercase", letterSpacing: '0.1em',
              }}>{(selected.status || "").replace("_", " ")}</span>
            </div>

            {/* Callback gold card if scheduled */}
            {selected.callbackDate && (
              <div style={{
                background: 'linear-gradient(135deg, var(--aurora-heritage-gold), var(--aurora-heritage-gold-light))',
                borderRadius: 18, padding: '16px 18px', marginBottom: 20,
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 12px 30px rgba(212,168,95,0.30)',
              }}>
                <div style={{
                  position: 'absolute', top: -30, right: -30, width: 140, height: 140,
                  background: 'radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%)',
                }} />
                <span className="aurora-micro" style={{ color: 'var(--aurora-heritage-gold-deep)', display: 'block' }}>
                  CALLBACK CONFIRMED
                </span>
                <p className="aurora-display" style={{ fontSize: 18, color: '#0E0D0A', margin: '4px 0 0' }}>
                  {selected.callbackDate}
                </p>
              </div>
            )}

            {/* Details grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
              {[
                { label: "CASTING", value: selected.cd || "—" },
                { label: "AGENCY", value: selected.agency || "—" },
                { label: "TYPE", value: selected.type || "—" },
                { label: "CALLBACK", value: selected.callbackDate || "—" },
              ].map(f => (
                <div key={f.label} className="aurora-glass" style={{ padding: "12px 14px", borderRadius: 14 }}>
                  <p className="aurora-micro" style={{ color: 'var(--aurora-dim)', margin: 0 }}>{f.label}</p>
                  <p style={{ fontSize: 14, color: 'var(--aurora-text)', margin: "4px 0 0", fontWeight: 500 }}>{f.value}</p>
                </div>
              ))}
            </div>

            {/* Change Status */}
            <div style={{ marginBottom: 16 }}>
              <p className="aurora-eyebrow" style={{ marginBottom: 12 }}>UPDATE STATUS</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {columns.map(col => {
                  const isActive = selected.status === col.id;
                  const color = STATUS_COLORS[col.id] || 'var(--aurora-dim)';
                  return (
                    <button
                      key={col.id}
                      onClick={async () => {
                        if (isActive) return;
                        try {
                          await dispatch(updateAuditionThunk({ id: selected.id, data: { status: col.id } })).unwrap();
                          // Refresh both the audition list AND stats so the
                          // Home hero ring (callback rate / bookings) stays
                          // in sync immediately.
                          dispatch(fetchAuditionsThunk());
                          dispatch(fetchAuditionStatsThunk());
                          setSelected({ ...selected, status: col.id });
                        } catch {}
                      }}
                      className="aurora-mono"
                      style={{
                        padding: "8px 14px", borderRadius: 100, cursor: "pointer",
                        fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                        background: isActive ? color : 'var(--aurora-glass)',
                        color: isActive ? '#0A0A0A' : 'var(--aurora-sub)',
                        border: isActive ? 'none' : '1px solid var(--aurora-glass-border)',
                        backdropFilter: isActive ? 'none' : 'blur(12px)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {col.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Close */}
            <button onClick={() => setSelected(null)} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: 'var(--aurora-text)', color: 'var(--aurora-bg)',
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>Done</button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCENES
   ═══════════════════════════════════════════════════ */
function ScenesScreen({ setTab }) {
  const dispatch = useDispatch();
  const fallbackScripts = useSelector((state) => state.sceneStudyScripts.scripts || []);
  const realScripts = useSelector((state) => state.scripts.scripts || []);
  const createLoading = useSelector((state) => state.scripts.createLoading);
  const scripts = (realScripts.length > 0 ? realScripts : fallbackScripts).map(mapScript);
  const fileInputRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // script object to confirm

  // Craft Journey (and other panels) dispatch this event to drop an
  // AI-generated script directly into Scene Study without going
  // through the upload flow.
  useEffect(() => {
    const handler = (e) => {
      const { content, title, craft_skill } = e.detail || {};
      if (!content) return;
      setSelectedScript({
        id: `virtual-${Date.now()}`,
        title: title || 'Practice Scene',
        content,
        // Carry craft_skill from the event detail. If it's missing,
        // fall back to whatever was already in sessionStorage (Craft
        // Journey writes there before firing this event).
        craft_skill: craft_skill || (() => {
          try {
            const raw = sessionStorage.getItem('preloadedScript');
            return raw ? (JSON.parse(raw).craft_skill || undefined) : undefined;
          } catch { return undefined; }
        })(),
      });
    };
    window.addEventListener('drst-load-virtual-script', handler);
    return () => window.removeEventListener('drst-load-virtual-script', handler);
  }, []);

  // Also pick up an AI-generated script that landed in sessionStorage
  // before this screen mounted (e.g. Craft Journey → drst-navigate to
  // scenes tab fires the navigate before this component listens).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('preloadedScript');
      if (!raw) return;
      const { scriptContent, scriptTitle, craft_skill } = JSON.parse(raw);
      if (scriptContent) {
        setSelectedScript({
          id: `virtual-${Date.now()}`,
          title: scriptTitle || 'Practice Scene',
          content: scriptContent,
          craft_skill,
        });
      }
      // Leave the sessionStorage value in place — SceneStudy/index.jsx
      // reads + removes it on its own mount to set up characters.
    } catch { /* swallow */ }
  }, []);

  // Slide the top bar + bottom tab bar out of the way while the
  // bottom-sheet delete confirm is up so its action buttons aren't
  // hidden behind the tab pill.
  useEffect(() => {
    if (!confirmDelete) return;
    window.dispatchEvent(new CustomEvent('drst-modal-open'));
    return () => window.dispatchEvent(new CustomEvent('drst-modal-closed'));
  }, [confirmDelete]);

  useEffect(() => {
    dispatch(fetchScriptsThunk());
    dispatch(getScripts());
  }, [dispatch]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".txt")) return;

    let content;
    const title = file.name.replace(/\.(pdf|txt)$/i, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    if (name.endsWith(".pdf")) {
      setPdfLoading(true);
      try {
        const rawText = await extractPdfText(file);
        // Actors Access / scanned PDFs have no text layer → pdfjs returns ~0
        // characters. Read the rendered pages with vision (already formatted as
        // CHARACTER: dialogue, so skip the GPT reformat step).
        if (isEmptyScript(rawText)) {
          const visionText = await pdfVisionFallback(file).catch(() => '');
          if (visionText) content = visionText;
        }
        if (!content) {
          // Check cache first — avoids re-calling the formatter on same content
          const cacheKey = `fmtscript_${simpleHash(rawText)}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            content = cached;
          } else {
            try {
              const res = await axiosInstance.post(endPoints.formatScript, { text: rawText });
              content = res?.data?.data?.formatted || res?.data?.formatted || rawText;
              if (content && content !== rawText) {
                sessionStorage.setItem(cacheKey, content); // cache it
              }
            } catch {
              content = rawText;
            }
          }
        }
      } catch {
        setPdfLoading(false);
        return;
      }
      setPdfLoading(false);
    } else {
      content = await file.text();
    }

    if (content && content.trim()) {
      // Parse the cast once at upload time so the BE can store it. The
      // backend echoes the same array back on subsequent fetches, which
      // lets the SceneStudy panel skip the parse step entirely.
      const characters = extractCharacters(content);
      dispatch(createScriptThunk({ title, content: content.trim(), characters }));
    }
  };

  if (selectedScript) {
    sessionStorage.setItem('preloadedScript', JSON.stringify({
      scriptContent: selectedScript.content,
      characters: Array.isArray(selectedScript.characters) ? selectedScript.characters : undefined,
      // Pre-selected role from parsed sides → SceneStudy lands the actor on
      // their part automatically (still changeable in the role picker).
      role: selectedScript.role,
      // Carry the Craft Journey skill tag through the rewrite so SceneStudy
      // can pass it to LiveSceneMode; without this, the completion handler
      // sees craftSkill='' and never fires completeCraftNode → progress
      // mode looks frozen after a finished session.
      craft_skill: selectedScript.craft_skill,
    }));
    return (
      <div style={{ height: "calc(100vh - 64px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--aurora-line)", flexShrink: 0 }}>
          <button onClick={() => setSelectedScript(null)} style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--aurora-surface-solid)',
            border: "1px solid var(--aurora-line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <Icon name="back" size={18} color="var(--aurora-sub)" />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--aurora-text)', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedScript.title}</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 24px", WebkitOverflowScrolling: "touch" }}>
          <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}><div style={{ fontSize: 13, color: "var(--aurora-sub)" }}>Loading...</div></div>}>
            <SceneStudy key={selectedScript.id} />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 24px" }}>
      <div style={{ padding: "20px 0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--aurora-text)', margin: 0, fontFamily: "'Playfair Display', serif" }}>Scene Study</h1>
        <button style={{
          width: 38, height: 38, borderRadius: 12,
          background: 'var(--aurora-glass)',
          border: '1px solid var(--aurora-glass-border)',
          backdropFilter: 'blur(12px)',
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <Icon name="search" size={16} color="var(--aurora-text)" />
        </button>
      </div>

      {/* Bring-your-own audition sides — Actors Access PDF → AI reads the other part */}
      <SidesUpload
        onReady={({ scriptContent, characters, role, title }) => {
          setSelectedScript({
            id: `sides-${Date.now()}`,
            title: title || 'Audition Sides',
            content: scriptContent,
            characters,
            role,
          });
        }}
      />

      {/* Upload CTA — Mint dashed border, wrapped in label for iOS Safari compatibility */}
      <label htmlFor="script-upload-input" style={{ display: "block", cursor: "pointer" }}>
        <div style={{
          background: MINT_DIM, borderRadius: 18, padding: 28, marginBottom: 20,
          border: `1.5px dashed ${MINT}40`, textAlign: "center",
        }}>
          {pdfLoading || createLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <svg style={{ width: 32, height: 32, color: MINT, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" style={{ opacity: 0.25 }} />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: 13, color: 'var(--aurora-sub)', margin: 0 }}>{pdfLoading ? "Reading your PDF…" : "Saving..."}</p>
              {pdfLoading && <p style={{ fontSize: 11, color: 'var(--aurora-dim)', margin: '2px 0 0' }}>This can take up to 90 seconds</p>}
            </div>
          ) : (
            <>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: `${MINT}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Icon name="plus" size={22} color={MINT} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--aurora-text)', margin: 0, letterSpacing: "-0.2px" }}>Add a Script</p>
              <p style={{ fontSize: 12, color: 'var(--aurora-sub)', margin: "6px 0 0", letterSpacing: "0.2px" }}>Upload PDF or paste text</p>
            </>
          )}
        </div>
        <input id="script-upload-input" ref={fileInputRef} type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={e => handleFileUpload(e.target.files?.[0])} />
      </label>

      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--aurora-dim)', margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "1px" }}>Your Scripts</p>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <>
          <div onClick={() => setConfirmDelete(null)} style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.45)", backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 100 }} />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 101,
            background: 'var(--aurora-surface-solid)',
            borderRadius: "24px 24px 0 0",
            padding: "20px 20px calc(40px + env(safe-area-inset-bottom, 0px))",
            boxShadow: 'var(--aurora-shadow-modal)',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--aurora-line)", margin: "0 auto 20px" }} />
            <p className="aurora-display" style={{ fontSize: 18, color: 'var(--aurora-text)', margin: "0 0 6px", textAlign: "center", letterSpacing: '-0.3px' }}>Delete Script?</p>
            <p style={{ fontSize: 13, color: 'var(--aurora-sub)', margin: "0 0 24px", textAlign: "center" }}>
              "{confirmDelete.title}" will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: "14px", borderRadius: 14, border: `1px solid var(--aurora-line)`,
                background: 'var(--aurora-surface-solid)', color: 'var(--aurora-text)', fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
              <button
                onClick={async () => {
                  setDeletingId(confirmDelete.id);
                  setConfirmDelete(null);
                  await dispatch(deleteScriptThunk(confirmDelete.id));
                  setDeletingId(null);
                }}
                style={{
                  flex: 1, padding: "14px", borderRadius: 14, border: "none",
                  background: "#ef4444", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >Delete</button>
            </div>
          </div>
        </>
      )}

      {scripts.map(sc => (
        <div key={sc.id} style={{
          background: deletingId === sc.id ? "rgba(239,68,68,0.08)" : 'var(--aurora-surface-solid)',
          borderRadius: 14, padding: "16px", marginBottom: 10,
          border: deletingId === sc.id ? "1px solid rgba(239,68,68,0.3)" : "1px solid var(--aurora-line)",
          display: "flex", alignItems: "center", gap: 14,
          opacity: deletingId === sc.id ? 0.5 : 1,
          transition: "all 0.2s",
        }}>
          <div onClick={() => setSelectedScript(sc)} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, cursor: "pointer" }}>
            <ProgressRing pct={sc.progress} size={44} stroke={3} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--aurora-text)', margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title}</p>
              <p style={{ fontSize: 12, color: 'var(--aurora-sub)', margin: "3px 0 0" }}>{sc.pages}{sc.lastPracticed ? ` · Last practiced ${sc.lastPracticed}` : ""}</p>
            </div>
          </div>
          {/* Delete button */}
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(sc); }}
            disabled={!!deletingId}
            style={{
              width: 34, height: 34, borderRadius: 10, border: "none",
              background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", flexShrink: 0,
            }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LIVE
   ═══════════════════════════════════════════════════ */
function LiveScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      <div style={{ padding: "24px 16px 12px", flexShrink: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, fontFamily: "'Playfair Display', serif" }}>Scene Study</h1>
        <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "8px 0 0", fontStyle: "italic", letterSpacing: "0.2px" }}>Rehearse with your AI scene partner</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 24px", WebkitOverflowScrolling: "touch" }}>
        <Suspense fallback={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>Loading Scene Study...</div>
          </div>
        }>
          <div style={{ minHeight: 200 }}>
            <SceneStudy />
          </div>
        </Suspense>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PROFILE
   ═══════════════════════════════════════════════════ */
const PLAN_BADGES = {
  basic: { label: 'Basic', emoji: '🌿', color: '#A7ECDA', bg: 'rgba(167,236,218,0.12)' },
  plus: { label: 'Plus', emoji: '⭐', color: '#FF8280', bg: 'rgba(255, 130, 128,0.12)' },
  premium: { label: 'Premium', emoji: '👑', color: '#FCE072', bg: 'rgba(252,224,114,0.12)' },
};

function ProfileScreen({ setCurrentPanel }) {
  const dispatch = useDispatch();
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const user = useSelector((state) => state.auth?.user);
  const profileData = useSelector((state) => state.profile?.profile);
  const statsData = useSelector((state) => state.auditions.stats?.data);
  // Auditions list as a live fallback when the cached stats endpoint
  // hasn't reported the latest write yet (mirrors the Home screen).
  const auditionsList = useSelector((state) => state.auditions.data || []);
  // Same dual-source pattern as the Practice tab — uploaded scripts
  // land in `state.scripts.scripts`; the older sceneStudyScripts slice
  // is just a fallback for legacy data.
  const realScripts = useSelector((state) => state.scripts.scripts || []);
  const fallbackScripts = useSelector((state) => state.sceneStudyScripts.scripts || []);
  const scripts = realScripts.length > 0 ? realScripts : fallbackScripts;
  const userName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Actor";
  const userEmail = user?.email || "";
  const initials = userName ? userName.charAt(0).toUpperCase() : "A";
  const auditionCount = auditionsList.length > 0
    ? auditionsList.length
    : (statsData?.total_auditions || 0);
  const bookedCount = auditionsList.length > 0
    ? auditionsList.filter(a => a.status === 'booked').length
    : (statsData?.total_booked || 0);
  const scriptsCount = scripts.length || 0;

  const headshot = profileData?.user_image || profileData?.headshot || null;
  const union = profileData?.actor_profile?.union || null;
  const basedIn = profileData?.actor_profile?.based_in || profileData?.based_in || null;
  const genres = profileData?.actor_profile?.genres || profileData?.genres || [];
  const yearsExperience = profileData?.actor_profile?.years_experience || profileData?.years_experience || null;

  const [subStatus, setSubStatus] = useState(null);

  useEffect(() => {
    // Refresh everything the stat cards depend on, so the numbers reflect
    // the latest state regardless of which tab the user visited last.
    dispatch(fetchProfileThunk());
    dispatch(fetchAuditionsThunk());
    dispatch(fetchAuditionStatsThunk());
    dispatch(fetchScriptsThunk());
    axiosInstance.get('/v1/subscriptions/status/').then(res => setSubStatus(res.data.data)).catch(() => {});
  }, [dispatch]);

  const menu = [
    { label: "Edit Profile", icon: "profile", action: () => setCurrentPanel("dash-profile") },
    { label: "Membership", icon: "star", action: () => setCurrentPanel("membership") },
    { label: "Log Out", icon: "logout", action: () => dispatch(performLogout()), danger: true },
    // Apple Guideline 5.1.1(V): in-app account deletion required for
    // any app that supports account creation.
    { label: "Delete Account", icon: "trash", action: () => setShowDeleteAccount(true), danger: true },
  ];

  return (
    <div className="aurora-orbs aurora-orbs-live" style={{ padding: "0 16px 32px", minHeight: '100%' }}>
      <div style={{ padding: "24px 0 28px", textAlign: "center" }}>
        {/* Eyebrow */}
        <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 14 }}>YOUR PROFILE</span>

        {/* Avatar */}
        <div style={{
          width: 92, height: 92, borderRadius: "50%", margin: "0 auto 14px",
          position: "relative", overflow: "hidden",
          boxShadow: '0 8px 28px rgba(255,130,128,0.18), 0 0 0 2px var(--aurora-glass-border)',
        }}>
          {headshot ? (
            <>
              <img src={headshot} alt="Headshot" onError={(e) => e.target.style.display = 'none'} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255, 130, 128,0.15) 0%, transparent 60%, rgba(159,230,180,0.10) 100%)", pointerEvents: "none" }} />
            </>
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `linear-gradient(135deg, var(--aurora-peach), var(--aurora-accent))`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 34, fontWeight: 600, color: '#fff',
              fontFamily: '"Space Grotesk", sans-serif',
            }}>{initials}</div>
          )}
        </div>

        <h1 className="aurora-display" style={{ fontSize: 22, color: 'var(--aurora-text)', margin: 0, letterSpacing: '-0.4px' }}>
          {userName}
        </h1>
        <p className="aurora-micro" style={{ color: 'var(--aurora-dim)', margin: "6px 0 0" }}>
          {userEmail}
        </p>

        {(union || basedIn) && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {union && (
              <span className="aurora-mono" style={{
                fontSize: 10, padding: "4px 12px", borderRadius: 100,
                background: 'color-mix(in oklch, var(--aurora-mint) 22%, transparent)',
                color: 'color-mix(in oklch, var(--aurora-mint) 75%, var(--aurora-text))',
                border: '1px solid color-mix(in oklch, var(--aurora-mint) 35%, transparent)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>{union}</span>
            )}
            {basedIn && (
              <span className="aurora-mono" style={{
                fontSize: 10, padding: "4px 12px", borderRadius: 100,
                background: 'var(--aurora-glass)',
                color: 'var(--aurora-sub)',
                border: '1px solid var(--aurora-glass-border)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                backdropFilter: 'blur(12px)',
              }}>📍 {basedIn}</span>
            )}
          </div>
        )}

        {/* Subscription badge + token balance */}
        {subStatus?.plan && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {(() => {
              const badge = PLAN_BADGES[subStatus.plan];
              return badge ? (
                <span className="aurora-mono" style={{
                  fontSize: 10, color: badge.color,
                  padding: '5px 14px', borderRadius: 100, background: badge.bg,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  {badge.emoji} {badge.label}
                </span>
              ) : null;
            })()}
            <span className="aurora-mono" style={{
              fontSize: 10, color: 'color-mix(in oklch, var(--aurora-mint) 75%, var(--aurora-text))',
              padding: '5px 14px', borderRadius: 100,
              background: 'color-mix(in oklch, var(--aurora-mint) 18%, transparent)',
              border: '1px solid color-mix(in oklch, var(--aurora-mint) 35%, transparent)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {subStatus.unlimited ? 'UNLIMITED' : `${subStatus.balance ?? 0} TOKENS`}
            </span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
        {[{ n: auditionCount, l: "AUDITIONS" }, { n: bookedCount, l: "BOOKED" }, { n: scriptsCount, l: "SCRIPTS" }].map(stat => (
          <div key={stat.l} className="aurora-glass" style={{ flex: 1, textAlign: "center", padding: "16px 8px", borderRadius: 18 }}>
            <p className="aurora-mono" style={{ fontSize: 26, color: 'var(--aurora-text)', margin: 0 }}>{stat.n}</p>
            <p className="aurora-micro" style={{ color: 'var(--aurora-dim)', margin: "4px 0 0" }}>{stat.l}</p>
          </div>
        ))}
      </div>

      {/* ── Aurora progression: XP wheel + level/rank/Takes ── */}
      <div style={{ marginBottom: 22 }}>
        <AuroraProgressCard />
      </div>

      {/* Menu */}
      <div className="aurora-glass" style={{ borderRadius: 20, overflow: "hidden" }}>
        {menu.map((item, i) => (
          <div key={item.label} onClick={item.action || undefined} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", cursor: "pointer",
            borderBottom: i < menu.length - 1 ? `1px solid var(--aurora-line)` : "none",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: item.danger
                ? 'color-mix(in oklch, var(--aurora-rose) 30%, transparent)'
                : 'color-mix(in oklch, var(--aurora-accent) 18%, transparent)',
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name={item.icon} size={16} color={item.danger ? '#E25E5E' : CORAL} />
            </div>
            <span style={{
              flex: 1, fontSize: 15, fontWeight: 500,
              color: item.danger ? '#E25E5E' : 'var(--aurora-text)',
            }}>{item.label}</span>
            {!item.danger && <Icon name="chevron" size={14} color="var(--aurora-dim)" />}
          </div>
        ))}
      </div>

      <DeleteAccountModal open={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MORE SCREEN — Grid of all additional features
   ═══════════════════════════════════════════════════ */
function MoreScreen({ setCurrentPanel }) {
  const dispatch = useDispatch();
  return (
    <div className="aurora-orbs aurora-orbs-live" style={{ padding: "0 16px 32px", minHeight: '100%' }}>
      <div style={{ padding: "24px 0 22px" }}>
        <span className="aurora-eyebrow" style={{ display: 'block', marginBottom: 4 }}>EXPLORE</span>
        <h1 className="aurora-display" style={{ fontSize: 26, color: 'var(--aurora-text)', margin: 0, letterSpacing: '-0.6px' }}>More features</h1>
        <p style={{ fontSize: 13, color: 'var(--aurora-sub)', margin: "6px 0 0" }}>All your tools in one place</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {MORE_FEATURES.map(f => (
          <button key={f.id} onClick={() => {
            if (f.id === 'whats-new') return window.dispatchEvent(new CustomEvent('drst-whats-new'));
            if (f.id === 'report-problem') return window.dispatchEvent(new CustomEvent('drst-report-problem'));
            setCurrentPanel(f.id);
          }} className="aurora-glass" style={{
            padding: "18px 16px", cursor: "pointer", textAlign: "left",
            transition: "transform 0.15s, box-shadow 0.2s",
            borderRadius: 18,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: `${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, marginBottom: 10,
            }}>{f.emoji}</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--aurora-text)', margin: 0, lineHeight: 1.3 }}>{f.label}</p>
          </button>
        ))}
      </div>

      {/* Log Out */}
      <button
        onClick={() => dispatch(performLogout())}
        className="aurora-mono"
        style={{
          width: "100%", marginTop: 24, padding: "14px", borderRadius: 100,
          background: "color-mix(in oklch, var(--aurora-rose) 22%, transparent)",
          border: "1px solid color-mix(in oklch, var(--aurora-rose) 40%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          cursor: "pointer", color: '#C04949',
          fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Icon name="logout" size={14} color="#C04949" />
        Log Out
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PANEL SCREEN — Wraps a dashboard panel for mobile
   ═══════════════════════════════════════════════════ */
// Panels that render full-bleed (no aurora-card wrapper) — Find a Reader
// is the swipe deck (full-screen card), Green Room/WhoWantsToRead manage
// their own page layout, Jericho is a complex growth panel deferred for
// later Aurora reskin.
const DARK_PANELS = new Set(["find-a-reader", "green-room", "who-wants-to-read", "jericho"]);
// Panels that own their own full-bleed chrome (X close, sticky header)
// and should NOT be wrapped in PanelScreen's aurora-card with horizontal
// margins — otherwise their sticky bars look like floating pills inside
// the card instead of edge-to-edge ingrained chrome.
const FULL_BLEED_PANELS = new Set(["membership"]);

// Wrapper to inject matchId into GreenRoomChat without React Router params.
// onBack lets the mobile sub-panel intercept the back action instead of the
// component navigating to '/dashboard/green-room' (which doesn't exist as a
// route in the Capacitor app).
function GreenRoomChatWrapper({ matchId, onBack }) {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ fontSize: 13, color: "#8a9a96" }}>Loading...</div>
      </div>
    }>
      <GreenRoomChat matchId={matchId} onBack={onBack} />
    </Suspense>
  );
}

// Wrapper to inject readerId into ReaderProfile without React Router params.
// ReaderProfile reads readerId from useParams() on web; here we pass it as a
// prop (props.readerId takes precedence) so it can mount as a mobile panel.
// onBack lets the mobile shell intercept the in-component "Back" button (which
// calls navigate(-1) — a no-op inside the Capacitor shell).
function ReaderProfileWrapper({ readerId, onBack }) {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ fontSize: 13, color: "#8a9a96" }}>Loading...</div>
      </div>
    }>
      <ReaderProfile readerId={readerId} onBack={onBack} />
    </Suspense>
  );
}

// Wrapper to inject matchId into ItsAScene without React Router params
function ItsASceneWrapper({ matchId, onGoToGreenRoom, onKeepBrowsing }) {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ fontSize: 13, color: "#8a9a96" }}>Loading...</div>
      </div>
    }>
      <ItsAScene matchId={matchId} onGoToGreenRoom={onGoToGreenRoom} onKeepBrowsing={onKeepBrowsing} />
    </Suspense>
  );
}

function PanelScreen({ panelId, onBack, initialSubPanel, readerId }) {
  // initialSubPanel seeds the sub-screen for a deep-link (e.g. a fresh
  // scene_partner_match → { id: 'its-a-scene', matchId }). It's only read at
  // mount; the parent re-keys PanelScreen on each new deep-link so this runs.
  const [subPanel, setSubPanel] = useState(initialSubPanel || null); // { id: 'green-room-chat', matchId: '123' }
  const PanelComponent = PANEL_COMPONENTS[panelId];

  // reader-profile renders bare (no PanelScreen header) — it owns its own
  // "Back" button, which we route to onBack so the Capacitor shell dismisses
  // the panel instead of relying on navigate(-1) (a no-op in the shell).
  if (panelId === 'reader-profile') {
    return <ReaderProfileWrapper readerId={readerId} onBack={onBack} />;
  }
  // Top-level tabs (Find Reader, Green Room) also render through here when
  // a user taps them, but MORE_FEATURES doesn't list them — fall back to
  // TABS so the title bar reads "Green Room" instead of literal "Feature".
  // Panels opened only via a teaser/deep-link (e.g. craft-journey) live in
  // neither list, so PANEL_LABELS supplies their header label.
  const feature =
    MORE_FEATURES.find(f => f.id === panelId) ||
    TABS.find(t => t.id === panelId) ||
    (PANEL_LABELS[panelId] ? { id: panelId, label: PANEL_LABELS[panelId] } : null);
  if (!PanelComponent) return null;

  const isDark = DARK_PANELS.has(panelId);
  const isFullBleed = FULL_BLEED_PANELS.has(panelId);

  // If we're in a sub-panel (e.g. GreenRoomChat or ItsAScene), render that instead.
  // GreenRoomChat owns its own header (back chevron + partner avatar + name +
  // online dot + Start Rehearsal CTA), so PanelScreen should NOT wrap it in
  // another header — that produced a duplicate back chevron behind the chat.
  if (subPanel?.id === 'green-room-chat') {
    return <GreenRoomChatWrapper matchId={subPanel.matchId} onBack={() => setSubPanel(null)} />;
  }

  if (subPanel?.id === 'its-a-scene') {
    return (
      <ItsASceneWrapper
        matchId={subPanel.matchId}
        onGoToGreenRoom={(matchId) => setSubPanel({ id: 'green-room-chat', matchId })}
        onKeepBrowsing={() => setSubPanel(null)}
      />
    );
  }

  return (
    <div className="aurora-orbs aurora-orbs-live" style={{ padding: "0 0 24px", minHeight: '100%' }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 12px",
      }}>
        <button
          onClick={onBack}
          className="aurora-tab-btn"
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'var(--aurora-glass)',
            border: '1px solid var(--aurora-glass-border)',
            backdropFilter: 'blur(12px)',
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: 'transform 0.15s ease',
          }}
        >
          <Icon name="back" size={16} color="var(--aurora-text)" />
        </button>
        <span className="aurora-display" style={{
          fontSize: 20, color: 'var(--aurora-text)', letterSpacing: '-0.3px',
        }}>{feature?.label || "Feature"}</span>
      </div>
      <Suspense fallback={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <div style={{ fontSize: 13, color: 'var(--aurora-sub)' }}>Loading...</div>
        </div>
      }>
        {(isDark || isFullBleed) ? (
          <PanelComponent
            embedded={panelId === 'leaderboard' ? true : undefined}
            onSelectMatch={panelId === 'green-room' ? (matchId) => setSubPanel({ id: 'green-room-chat', matchId }) : undefined}
            onMatchNavigate={panelId === 'who-wants-to-read' ? (matchId) => setSubPanel({ id: 'its-a-scene', matchId }) : undefined}
          />
        ) : (
          <div
            className="aurora-card"
            style={{
              margin: "0 12px",
              padding: 20,
              minHeight: 200,
            }}
          >
            <PanelComponent
              embedded={panelId === 'leaderboard' ? true : undefined}
              onSelectMatch={panelId === 'green-room' ? (matchId) => setSubPanel({ id: 'green-room-chat', matchId }) : undefined}
              onMatchNavigate={panelId === 'who-wants-to-read' ? (matchId) => setSubPanel({ id: 'its-a-scene', matchId }) : undefined}
            />
          </div>
        )}
      </Suspense>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TOP-BAR AVATAR
   ───────────────────────────────────────────────────
   Compact avatar button shown in the mobile top bar.
   Falls back to initials over the brand gradient when
   no headshot URL is available.
   ═══════════════════════════════════════════════════ */
function TopBarAvatar({ active, onClick }) {
  const user = useSelector((state) => state.auth?.user);
  const profileData = useSelector((state) => state.profile?.profile);
  const headshot =
    profileData?.user_image ||
    profileData?.actor_profile?.headshot ||
    profileData?.headshot ||
    user?.user_image ||
    null;
  const first = user?.first_name?.[0] || profileData?.first_name?.[0] || "";
  const last = user?.last_name?.[0] || profileData?.last_name?.[0] || "";
  const initials = (first + last).toUpperCase() || "A";

  const size = 34;
  const ringColor = active ? MINT : "rgba(255,255,255,0.18)";

  return (
    <button
      type="button"
      aria-label="Profile and settings"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        boxShadow: `inset 0 0 0 1.5px ${ringColor}`,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {headshot ? (
        <img
          src={headshot}
          alt=""
          onError={(e) => { e.target.style.display = "none"; }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            display: "block",
          }}
        />
      ) : (
        <span
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${MINT}, ${CORAL_SOFT}, ${CORAL})`,
            color: BG_DEEPEST,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {initials}
        </span>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   APP SHELL — Mobile + Desktop
   ═══════════════════════════════════════════════════ */
export default function DrSelfTapeApp() {
  const [tab, setTab] = useState("home");
  const [currentPanel, setCurrentPanel] = useState(null);
  // Deep-link target for a Green Room sub-panel (e.g. a fresh "It's a Scene"
  // match arriving over the socket). Passed into PanelScreen as initialSubPanel
  // so it opens the match screen instead of the generic Green Room list.
  const [pendingSubPanel, setPendingSubPanel] = useState(null); // { id, matchId }
  // readerId for a deep-linked reader-profile panel (Green Room chat header →
  // "View Profile"). Threaded into PanelScreen which renders ReaderProfileWrapper.
  const [pendingReaderId, setPendingReaderId] = useState(null);
  // Free-first-review onboarding: true while a new user is inside their one
  // free Tape Review, so TapeReview shows the paywall after the result.
  const [firstReviewActive, setFirstReviewActive] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showNoTokens, setShowNoTokens] = useState(false);
  const [whatsNewForce, setWhatsNewForce] = useState(false);
  const [showReport, setShowReport] = useState(false);
  // Top bar is now pinned at the top — the previous scroll-driven hide
  // confused users who tried to tap the bell / avatar after scrolling
  // down. The bar still slides away for modals (driven by the modal-
  // open event listener below), which is the one case it should disappear.
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const handleContentScroll = (e) => {
    // Track scroll for any consumers that care, but no longer toggle
    // headerHidden — the bar stays anchored to the top of the screen.
    lastScrollYRef.current = e.currentTarget.scrollTop;
  };
  // No-op kept so existing useEffect deps don't break.
  useEffect(() => { lastScrollYRef.current = 0; }, [tab, currentPanel]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed')) {
      window.history.replaceState({}, '', '/');
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, []);

  // Bottom tab bar can collide with bottom-sheet modal action rows
  // (Delete confirm, etc.) — same root cause as the top bar.
  // tabBarHidden is driven by the same modal-open count so both bars
  // slide away together for every modal we own.
  const [tabBarHidden, setTabBarHidden] = useState(false);

  // Force-hide the persistent top bar + bottom tab bar whenever a
  // modal is open. Both bars live at zIndex 50; modals portal to body
  // at z-100+ and SHOULD win on stacking, but their fixed position at
  // top / bottom of the viewport collides with the modal's title row
  // (top bar) and action button row (bottom bar) regardless of z.
  // Modals fire `drst-modal-open` on mount and `drst-modal-closed` on
  // unmount so both bars get out of the way.
  useEffect(() => {
    let count = 0;
    const onOpen = () => {
      count += 1;
      setHeaderHidden(true);
      setTabBarHidden(true);
    };
    const onClose = () => {
      count = Math.max(0, count - 1);
      if (count === 0) {
        setHeaderHidden(false);
        setTabBarHidden(false);
      }
    };
    window.addEventListener('drst-modal-open', onOpen);
    window.addEventListener('drst-modal-closed', onClose);
    return () => {
      window.removeEventListener('drst-modal-open', onOpen);
      window.removeEventListener('drst-modal-closed', onClose);
    };
  }, []);

  useEffect(() => {
    const handler = () => setShowNoTokens(true);
    window.addEventListener('insufficient_tokens', handler);
    return () => window.removeEventListener('insufficient_tokens', handler);
  }, []);

  // Free-first-review: onboarding's "Try my free review" fires this; drop the
  // user straight into the Tape Review tab in first-review mode (paywall after
  // the result). Lives here because TapeReview mounts in this root component
  // while onboarding mounts inside HomeScreen.
  useEffect(() => {
    const handler = () => {
      setFirstReviewActive(true);
      setCurrentPanel(null);
      setTab('tape-review');
    };
    window.addEventListener('drst-start-first-review', handler);
    return () => window.removeEventListener('drst-start-first-review', handler);
  }, []);

  // Durable first-review handoff: granting AI consent on the Tape Review screen
  // remounts this component (resetting `tab` to home), which would bounce the
  // new user back. The sessionStorage flag (set by onboarding's offer) is
  // re-read on every mount so the first-review screen is restored — and on that
  // second pass consent already exists, so it sticks. The flag is cleared only
  // once the user is committed (upload starts) or upgrades, so it survives any
  // number of remounts in between.
  useEffect(() => {
    let pending = false;
    try { pending = window.sessionStorage.getItem('dst_first_review') === '1'; } catch { /* noop */ }
    if (!pending) return;
    setFirstReviewActive(true);
    setCurrentPanel(null);
    setTab('tape-review');
  }, []);

  // Listen for cross-component mobile navigation (e.g. Generator → Scene Study)
  useEffect(() => {
    const handler = (e) => {
      const { tab: targetTab, panel: targetPanel, subPanel: targetSubPanel, matchId, readerId } = e.detail || {};
      if (targetTab) {
        setCurrentPanel(null);
        setTab(targetTab);
      } else if (targetPanel && PANEL_COMPONENTS[targetPanel]) {
        // Guard against navigating to a panel that isn't registered —
        // otherwise the content area renders blank.
        // A subPanel (e.g. a fresh scene_partner_match → 'its-a-scene') is
        // stashed so the panel opens that sub-screen instead of its list.
        // reader-profile carries a readerId instead (Green Room chat header →
        // "View Profile"), threaded into PanelScreen via pendingReaderId.
        setPendingSubPanel(targetSubPanel ? { id: targetSubPanel, matchId } : null);
        setPendingReaderId(targetPanel === 'reader-profile' ? (readerId != null ? String(readerId) : null) : null);
        setCurrentPanel(targetPanel);
      }
    };
    window.addEventListener('drst-navigate', handler);
    return () => window.removeEventListener('drst-navigate', handler);
  }, []);

  // Manual "What's New" open from the More menu.
  useEffect(() => {
    const handler = () => setWhatsNewForce(true);
    window.addEventListener('drst-whats-new', handler);
    return () => window.removeEventListener('drst-whats-new', handler);
  }, []);

  // "Report a Problem" open from the More menu.
  useEffect(() => {
    const handler = () => setShowReport(true);
    window.addEventListener('drst-report-problem', handler);
    return () => window.removeEventListener('drst-report-problem', handler);
  }, []);

  const handleSetTab = (id) => {
    // A deliberate tab tap discards any pending scene-match deep-link, so the
    // Green Room can never later auto-jump into a stale match.
    setPendingSubPanel(null);
    setPendingReaderId(null);
    // Leaving via any deliberate tab tap permanently exits first-review mode —
    // clear the durable flag so the mount-effect can't re-pin the user to the
    // Tape Review tab (the consent-decline / never-upload soft-lock).
    if (id !== 'tape-review') {
      setFirstReviewActive(false);
      try { window.sessionStorage.removeItem('dst_first_review'); } catch { /* noop */ }
    }
    setTab(id);
    setCurrentPanel(null);
  };

  const screens = {
    home: <HomeScreen setTab={handleSetTab} setCurrentPanel={setCurrentPanel} />,
    auditions: <AuditionsScreen />,
    scenes: <ScenesScreen setTab={handleSetTab} />,
    live: <LiveScreen />,
    "find-a-reader": (
      <PanelScreen panelId="find-a-reader" onBack={() => handleSetTab("home")} />
    ),
    "green-room": (
      <PanelScreen panelId="green-room" onBack={() => handleSetTab("home")} />
    ),
    // Leaderboard tab — embedded mode so the close-X is hidden and the
    // sticky your-rank bar sits above the floating tab bar.
    leaderboard: (
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
        <Leaderboard embedded />
      </Suspense>
    ),
    "tape-review": (
      <div style={{ padding: '2px 16px 20px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>🎥</span>
            <h1 className="aurora-display" style={{ fontSize: 24, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.4px' }}>Tape Review</h1>
            <span style={{ fontSize: 10, fontWeight: 800, background: 'var(--aurora-accent-light)', color: 'var(--aurora-accent-deep)', padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em' }}>AI</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.4 }}>
            Submit a self-tape and get casting-grade acting notes — your performance, framing, eyeline, and the moves that book the room.
          </p>
        </div>
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
          <TapeReview
            firstReview={firstReviewActive}
            onUpgrade={() => {
              try { window.sessionStorage.removeItem('dst_first_review'); } catch { /* noop */ }
              setFirstReviewActive(false);
              setCurrentPanel('membership');
            }}
            onExitFirstReview={() => {
              try { window.sessionStorage.removeItem('dst_first_review'); } catch { /* noop */ }
              setFirstReviewActive(false);
              setTab('home');
            }}
          />
        </Suspense>
      </div>
    ),
    profile: <ProfileScreen setCurrentPanel={setCurrentPanel} />,
    more: <MoreScreen setCurrentPanel={setCurrentPanel} />,
  };

  return (
    <div style={{ background: "var(--bg-deep)", height: "100dvh", overflow: "hidden", fontFamily: '-apple-system, BlinkMacSystemFont, "Space Grotesk", "Poppins", sans-serif', color: "var(--text-primary)", transition: "background 0.3s, color 0.3s", position: "fixed", inset: 0 }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet" />
      <UpdateBanner />
      {/* What's New — auto after an update, or manually from the More menu via
          the drst-whats-new event. (WhatsNewModal shows once on its own; new
          users just get it as feature discovery.) */}
      <WhatsNewModal
        forceOpen={whatsNewForce}
        onClose={() => setWhatsNewForce(false)}
      />
      {showReport && <ReportProblemModal onClose={() => setShowReport(false)} />}
      {/* No tokens modal */}
      {showNoTokens && (
        <NoTokensModal
          onClose={() => setShowNoTokens(false)}
          onUpgrade={() => {
            setShowNoTokens(false);
            setCurrentPanel('membership');
          }}
        />
      )}

      {/* Celebration overlay */}
      {showCelebration && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* Confetti particles */}
          {[...Array(24)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${(i * 4.16) % 100}%`,
              top: '-10px',
              width: i % 3 === 0 ? 10 : 8,
              height: i % 3 === 0 ? 10 : 14,
              borderRadius: i % 2 === 0 ? '50%' : '2px',
              background: ['#FF8280', '#A7ECDA', '#FCE072', '#FFB49A', '#5ee6b8', '#ffffff'][i % 6],
              animation: `confettiFall ${1.5 + (i % 4) * 0.4}s ease-in ${(i % 8) * 0.15}s forwards`,
              transform: `rotate(${i * 15}deg)`,
            }} />
          ))}
          {/* Modal */}
          <div style={{
            position: 'absolute', bottom: 80, left: 16, right: 16,
            background: 'var(--aurora-surface-solid)',
            border: '1px solid var(--aurora-line)',
            borderRadius: 28, padding: '28px 24px', textAlign: 'center',
            animation: 'celebrationPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
            boxShadow: '0 24px 60px rgba(212,168,95,0.30), var(--aurora-shadow-modal)',
            pointerEvents: 'all',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
            <h2 className="aurora-display" style={{ fontSize: 22, color: 'var(--aurora-text)', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              Welcome to Dr Self Tape
            </h2>
            <p style={{ fontSize: 14, color: 'var(--aurora-sub)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Your membership is active. Tokens are ready to use.
            </p>
            <button
              onClick={() => setShowCelebration(false)}
              style={{
                background: 'linear-gradient(135deg, var(--aurora-accent), var(--aurora-accent-deep))',
                border: 'none', borderRadius: 14, padding: '14px 32px',
                fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer',
                width: '100%',
                boxShadow: 'var(--aurora-shadow-coral)',
              }}
            >
              Start Rehearsing 🎭
            </button>
          </div>
        </div>
      )}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; position: fixed; width: 100%; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes celebrationPop {
          0% { opacity: 0; transform: scale(0.7) translateY(30px); }
          60% { transform: scale(1.05) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes micPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 40px ${CORAL}25; }
          50% { transform: scale(1.08); box-shadow: 0 0 60px ${CORAL}35; }
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", height: "100dvh", minHeight: 0 }}>
          {/* Top Bar — Aurora style: logo badge + mono wordmark, streak + bell + avatar.
              Solid pinned bar with a subtle bottom hairline so the chrome
              reads as part of the build, not floating elements over the
              page gradient. Still slides up when a modal opens. */}
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
            background: "var(--aurora-surface-solid)",
            borderBottom: "1px solid var(--aurora-line)",
            padding: "calc(env(safe-area-inset-top, 0px) + 4px) 16px 0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            height: "calc(54px + env(safe-area-inset-top, 0px))",
            flexShrink: 0,
            pointerEvents: headerHidden ? 'none' : 'auto',
            opacity: headerHidden ? 0 : 1,
            transform: headerHidden ? 'translateY(-100%)' : 'translateY(0)',
            transition: 'opacity 220ms ease, transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'opacity, transform',
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, pointerEvents: 'auto' }}>
              <img src={logo} alt="Dr Self Tape" style={{
                width: 32, height: 32, objectFit: "contain",
                borderRadius: 10,
                boxShadow: '0 0 0 1px var(--aurora-line), 0 4px 12px rgba(10,10,10,0.06)',
                background: 'var(--aurora-surface-solid)',
                padding: 2,
              }} />
              <span className="aurora-micro" style={{ color: 'var(--aurora-dim)', fontSize: 10 }}>
                DR · SELF · TAPE
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: 'auto' }}>
              <NotificationBell onNavigate={({ panel, tab }) => {
                // Discard any pending scene-match deep-link — a bell tap to the
                // Green Room must show the list, not re-open a stale match.
                setPendingSubPanel(null);
                setPendingReaderId(null);
                // MeetingRoom is react-router-only (useParams + location.state)
                // and can't mount as a mobile panel with a room — route live-
                // session notifications to find-a-reader (where the scene is
                // joined) instead of opening an empty meeting panel.
                if (panel === 'meeting') { setCurrentPanel(null); handleSetTab('find-a-reader'); return; }
                if (panel && PANEL_COMPONENTS[panel]) setCurrentPanel(panel);
                if (tab) { handleSetTab(tab); }
              }} />
              <TopBarAvatar
                active={tab === "profile" && !currentPanel}
                onClick={() => { handleSetTab("profile"); }}
              />
            </div>
          </div>

          {/* Logo watermark */}
          <div style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", zIndex: 0, opacity: 0.025,
          }}>
            <img src={logo} alt="" style={{ width: 300, height: "auto", userSelect: "none" }} draggable={false} />
          </div>

          {/* Scrollable Content Area — sits between fixed top bar and floating tab pill */}
          <div onScroll={handleContentScroll} style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            paddingTop: "calc(54px + env(safe-area-inset-top, 0px))",
            paddingBottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
            WebkitOverflowScrolling: "touch",
            position: "relative", zIndex: 1,
          }}>
            {currentPanel ? (
              <PanelScreen
                // Re-key on the pending sub-panel so a fresh deep-link (e.g. a
                // new scene_partner_match) remounts PanelScreen and its local
                // subPanel state initializes from initialSubPanel. reader-profile
                // re-keys on its readerId so a second "View Profile" reloads it.
                key={
                  pendingSubPanel
                    ? `${currentPanel}:${pendingSubPanel.id}:${pendingSubPanel.matchId}`
                    : currentPanel === 'reader-profile'
                      ? `reader-profile:${pendingReaderId}`
                      : currentPanel
                }
                panelId={currentPanel}
                initialSubPanel={pendingSubPanel && currentPanel === 'green-room' ? pendingSubPanel : null}
                readerId={currentPanel === 'reader-profile' ? pendingReaderId : null}
                onBack={() => { setPendingSubPanel(null); setPendingReaderId(null); setCurrentPanel(null); }}
              />
            ) : (
              screens[tab]
            )}
          </div>

          {/* Bottom Tab Bar — floating glass pill w/ active-pill highlight.
           * Active tab = solid black pill containing icon + horizontal label.
           * Inactive tabs = just the icon (no label).
           * Slides down + fades when a modal is open so bottom-sheet
           * action buttons (Cancel / Delete) aren't hidden behind it. */}
          <div style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
            left: 12, right: 12,
            zIndex: 50,
            background: 'rgba(255, 255, 255, 0.78)',
            backdropFilter: "blur(28px) saturate(1.6)",
            WebkitBackdropFilter: "blur(28px) saturate(1.6)",
            border: '1px solid rgba(255, 255, 255, 0.55)',
            borderRadius: 28,
            boxShadow: "0 12px 40px rgba(10,10,10,0.10), inset 0 1px 0 rgba(255,255,255,0.7)",
            transition: "background 0.3s, transform 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: '8px 10px',
            height: 64,
            pointerEvents: tabBarHidden ? 'none' : 'auto',
            opacity: tabBarHidden ? 0 : 1,
            transform: tabBarHidden ? 'translateY(120%)' : 'translateY(0)',
          }}>
            {TABS.map(t => {
              const a = tab === t.id && !currentPanel;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSetTab(t.id)}
                  className="aurora-tab-btn"
                  style={{
                    // Cap the active pill so a long label (e.g. "Green Room")
                    // can never widen the bar enough to push/drop other tabs —
                    // the bar layout stays consistent on every tab.
                    flex: a ? '0 1 auto' : '0 0 40px',
                    maxWidth: a ? 108 : 40,
                    background: a ? 'var(--aurora-accent-light)' : 'transparent',
                    border: "none", cursor: "pointer",
                    display: "flex", flexDirection: "row",
                    alignItems: "center", justifyContent: 'center',
                    gap: a ? 6 : 0,
                    padding: a ? '10px 12px' : '10px 8px',
                    borderRadius: 100,
                    transition: 'all 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
                    minHeight: 44,
                    position: 'relative',
                  }}
                >
                  <Icon
                    name={t.icon}
                    size={20}
                    color={(a || t.highlight) ? 'var(--aurora-accent-deep)' : 'var(--aurora-dim)'}
                  />
                  {a && (
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: 'var(--aurora-accent-deep)',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      maxWidth: 76,
                    }}>{t.label}</span>
                  )}
                  {t.highlight && !a && (
                    <span style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--aurora-accent-deep)',
                      boxShadow: '0 0 0 2px rgba(255,255,255,0.85)',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Desktop Sidebar */}
          <div style={{
            width: 250, background: BG_DEEPEST, borderRight: `1px solid ${BORDER}`,
            padding: "24px 14px", display: "flex", flexDirection: "column",
            position: "sticky", top: 0, height: "100vh",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 36 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${MINT}, ${CORAL_SOFT})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: BG_DEEPEST }}>D</span>
              </div>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: "-0.3px", display: "block" }}>Dr Self Tape</span>
                <span style={{ fontSize: 10, color: TEXT_MUTED, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>One take at a time</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {TABS.map(t => {
                const a = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "11px 12px",
                    borderRadius: 12, border: "none", cursor: "pointer",
                    background: a ? CORAL_DIM : "transparent",
                  }}>
                    <Icon name={t.icon} size={18} color={a ? CORAL : TEXT_SECONDARY} />
                    <span style={{ fontSize: 14, fontWeight: a ? 600 : 500, color: a ? CORAL : TEXT_SECONDARY }}>{t.label}</span>
                  </button>
                );
              })}
              <div style={{ borderTop: `1px solid ${BORDER}`, margin: "12px 0", paddingTop: 12 }}>
                {[{ id: "find-a-reader", icon: "community", label: "Find a Reader" }, { id: "green-room", icon: "mic", label: "Green Room" }].map(t => (
                  <button key={t.id} onClick={() => setCurrentPanel(t.id)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "11px 12px",
                    borderRadius: 12, border: "none", cursor: "pointer", background: "transparent", width: "100%", marginBottom: 2,
                  }}>
                    <Icon name={t.icon} size={18} color={TEXT_MUTED} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: TEXT_MUTED }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px",
              borderRadius: 14, background: `${MINT}06`,
            }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${MINT}, ${CORAL_SOFT})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: BG_DEEPEST }}>D</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>Demo Actor</p>
                <p style={{ fontSize: 11, color: TEXT_MUTED, margin: 0 }}>Pro</p>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, maxWidth: 920, margin: "0 auto", padding: "8px 0" }}>
            {screens[tab]}
          </div>
        </div>
      )}
    </div>
  );
}
