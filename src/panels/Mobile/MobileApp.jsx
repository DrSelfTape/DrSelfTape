import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { useTokenBalance } from "../../hooks/useTokenBalance";
import NoTokensModal from "../../components/NoTokensModal";
import { fetchAuditionsThunk, fetchAuditionStatsThunk, createAuditionThunk } from "../../redux/features/auditions/auditionsSlice";
import { getScripts } from "../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice";
import { fetchSubmissionsThunk, promoteToAuditionThunk } from "../../redux/features/submissions/submissionsSlice";
import { fetchScriptsThunk, createScriptThunk, deleteScriptThunk } from "../../redux/features/scripts/scriptsSlice";
import { fetchProfileThunk } from "../../redux/features/profile/profileSlice";
import { logoutUser } from "../../redux/features/auth/authSlice";
import { fetchMatchingStats, toggleAvailability } from "../../redux/features/readers/readersMatchSlice";
import PendingLikesBanner from "../../components/Dashboard/PendingLikesBanner";
import ReaderOnboardingModal from "../../components/Dashboard/ReaderOnboardingModal";
import NotificationBell from "../../components/Dashboard/NotificationBell";
import TutorialChecklist from "../../components/Dashboard/TutorialChecklist";
import TutorialAchievement from "../../components/Dashboard/TutorialAchievement";
import { logo } from "../../assets/images";
import axiosInstance from "../../redux/http";
import endPoints from "../../redux/constant";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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

const WhoWantsToRead = lazy(() => import("../Dashboard/FindAReader/WhoWantsToRead"));
const Favorites = lazy(() => import("../Dashboard/FindAReader/Favorites"));
const FindAReader = lazy(() => import("../Dashboard/FindAReader"));
const GreenRoom = lazy(() => import("../Dashboard/FindAReader/GreenRoom"));
const GreenRoomChat = lazy(() => import("../Dashboard/FindAReader/GreenRoomChat"));
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
const CORAL = "#C855F0";
const CORAL_DIM = "rgba(255,130,128,0.12)";
const CORAL_GLOW = "rgba(255,130,128,0.25)";

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

const STATUS_COLORS = {
  submitted: TEXT_MUTED,
  in_review: BLUE,
  audition: "#C855F0",
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
  };
}

/* ═══════════════════════════════════════════════════
   ICON SYSTEM
   ═══════════════════════════════════════════════════ */
function Icon({ name, size = 20, color = TEXT_SECONDARY }) {
  const p = {
    home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1",
    auditions: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
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
  { id: "auditions", icon: "auditions", label: "Auditions" },
  { id: "find-a-reader", icon: "community", label: "Find Reader" },
  { id: "green-room", icon: "mic", label: "Green Room" },
  { id: "more", icon: "more", label: "More" },
];

const MORE_FEATURES = [
  { id: "cd-sim", label: "CD Sim Mode", desc: "Live audition — real-time CD feedback", emoji: "🎬", color: "#C855F0" },
  { id: "scripts", label: "Scripts", desc: "Your personal script library", emoji: "📝", color: "#FFB49A" },
  { id: "submissions", label: "Submissions", desc: "Track every tape you send", emoji: "📤", color: "#5ee6b8" },
  { id: "reports", label: "Reports", desc: "Your career at a glance", emoji: "📊", color: "#b89aff" },
  { id: "generator", label: "Scene Generator", desc: "AI-written sides on demand", emoji: "✨", color: "#C855F0" },
  { id: "membership", label: "Membership", desc: "Your plan & billing", emoji: "👑", color: "#FCE072" },
  { id: "who-wants-to-read", label: "Who Wants to Read", desc: "Actors ready to rehearse with you", emoji: "❤️", color: "#C855F0" },
  { id: "favorites", label: "Favorites", desc: "Your saved scene partners", emoji: "⭐", color: "#FCE072" },
  { id: "dash-profile", label: "Edit Profile", desc: "Update your headshot, bio & info", emoji: "👤", color: "#A7ECDA" },
];

const PANEL_COMPONENTS = {
  "find-a-reader": FindAReader,
  "green-room": GreenRoom,
  "cd-sim": CDSim,
  "scripts": Scripts,
  "submissions": Submissions,
  "reports": Reports,
  "generator": AuditionGenerator,
  "membership": Membership,
  "dash-profile": DashProfile,
  "who-wants-to-read": WhoWantsToRead,
  "favorites": Favorites,
  "meeting": MeetingRoom,
};

/* ═══════════════════════════════════════════════════
   HOME
   ═══════════════════════════════════════════════════ */
function HomeScreen({ setTab, setCurrentPanel }) {
  const dispatch = useDispatch();
  const { permission, subscribe, supported, showIOSPrompt, setShowIOSPrompt } = usePushNotifications();
  const { balance, refresh: refreshTokens } = useTokenBalance();
  const rawAuditions = useSelector((state) => state.auditions.data || []);
  const rawScripts = useSelector((state) => state.sceneStudyScripts.scripts || []);
  const s = useSelector((state) => state.auditions.stats?.data || {});
  const submissions = useSelector((state) => state.submissions.submissions || []);
  const matchingStats = useSelector((state) => state.readersMatch.matchingStats);
  const isAvailable = useSelector((state) => state.readersMatch.isAvailable);
  const availabilityToggling = useSelector((state) => state.readersMatch.availabilityToggling);

  const auditions = rawAuditions.map(mapAudition);
  const scripts = rawScripts.map(mapScript);
  const recentSubmissions = submissions.slice(0, 4);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorialAchievement, setShowTutorialAchievement] = useState(false);

  useEffect(() => {
    const handler = () => setShowTutorialAchievement(true);
    window.addEventListener('drst-tutorial-complete', handler);
    return () => window.removeEventListener('drst-tutorial-complete', handler);
  }, []);

  useEffect(() => {
    dispatch(fetchAuditionStatsThunk());
    dispatch(getScripts());
    dispatch(fetchSubmissionsThunk());
    dispatch(fetchMatchingStats());

    if (!localStorage.getItem('reader_onboarding_seen')) {
      const timer = setTimeout(() => setShowOnboarding(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [dispatch]);

  const stats = [
    { label: "Submissions", value: submissions.length || 0, icon: "auditions", color: MINT },
    { label: "Callbacks", value: s.total_callbacks || 0, icon: "fire", color: GOLD },
    { label: "Auditions", value: s.total_auditions || 0, icon: "calendar", color: CORAL_SOFT },
    { label: "Booked", value: s.total_booked || 0, icon: "star", color: GREEN },
  ];
  const callbacks = auditions.filter(a => callbackBadge(a.callbackDate));

  return (
    <div style={{ padding: "0 16px 24px" }}>
      {showOnboarding && <ReaderOnboardingModal onClose={() => setShowOnboarding(false)} />}
      {showTutorialAchievement && <TutorialAchievement show onClose={() => setShowTutorialAchievement(false)} />}

      {/* Pending likes banner */}
      <div style={{ paddingTop: 16, marginBottom: (matchingStats?.pending_likes_count || 0) > 0 ? 8 : 0 }}>
        <PendingLikesBanner onNavigate={() => setTab("find-a-reader")} />
      </div>

      {/* Centered logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20, paddingBottom: 6 }}>
        <img src={logo} alt="Dr Self Tape" style={{ width: 48, height: 48, objectFit: "contain", filter: "brightness(1.5) drop-shadow(0 0 14px rgba(200,85,240,0.4))" }} />
        <p style={{ fontSize: 10, fontWeight: 700, color: "#BBBBBB", letterSpacing: "4px", textTransform: "uppercase", marginTop: 8 }}>Dr Self Tape</p>
      </div>

      {/* Greeting */}
      <div style={{ padding: "16px 0 24px" }}>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: 0, fontFamily: "'Poppins', sans-serif" }}>Good evening</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: TEXT_PRIMARY, margin: "4px 0 0", letterSpacing: "-0.5px", fontFamily: "'Playfair Display', serif" }}>
          Welcome back
        </h1>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setTab("live")} style={{
          flex: 1, background: `linear-gradient(135deg, ${CORAL}, #e06e6c)`, border: "none",
          borderRadius: 16, padding: "14px 16px", cursor: "pointer", textAlign: "left",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="mic" size={20} color="#fff" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Go Live</span>
          </div>

        </button>
        <button onClick={() => setCurrentPanel("generator")} style={{
          flex: 1, background: BG_ELEVATED, border: `1px solid ${BORDER_ACTIVE}`,
          borderRadius: 16, padding: "14px 16px", cursor: "pointer", textAlign: "left",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="sparkle" size={20} color={MINT} />
            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY }}>Generate</span>
          </div>

        </button>
      </div>

      {/* Availability toggle */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => !availabilityToggling && dispatch(toggleAvailability(!isAvailable))}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            background: isAvailable ? "rgba(34,197,94,0.08)" : BG_CARD,
            border: isAvailable ? "1px solid rgba(34,197,94,0.2)" : `1px solid ${BORDER}`,
            borderRadius: 14, padding: "14px 16px", cursor: "pointer",
          }}
        >
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: isAvailable ? "#22c55e" : "#666",
            boxShadow: isAvailable ? "0 0 8px rgba(34,197,94,0.5)" : "none",
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: isAvailable ? "#22c55e" : TEXT_SECONDARY }}>
            {isAvailable ? "Available to Read" : "Go Available"}
          </span>
        </button>
      </div>

      {/* Find a Reader CTA */}
      <div
        onClick={() => setTab("find-a-reader")}
        style={{
          background: BG_CARD, borderRadius: 16, padding: "16px",
          border: `1px solid rgba(167,236,218,0.15)`, marginBottom: 24,
          cursor: "pointer", borderLeft: `3px solid ${MINT}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>Find a Reader</span>
              {(matchingStats?.pending_likes_count || 0) > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#fff", background: "#C855F0",
                  padding: "2px 8px", borderRadius: 20, minWidth: 20, textAlign: "center",
                }}>
                  {matchingStats.pending_likes_count}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              <span style={{ fontSize: 12, color: MINT, fontWeight: 500 }}>
                {matchingStats?.available_count || 0} online now
              </span>
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: MINT }}>Go &rarr;</span>
        </div>
      </div>

      {/* Tutorial checklist */}
      <div style={{ marginBottom: 20 }}>
        <TutorialChecklist onNavigate={({ tab, panel }) => {
          if (tab) { setTab(tab); }
          if (panel) { setCurrentPanel(panel); }
        }} />
      </div>

      {/* Key stats — 2 numbers only */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Auditions", value: s.total_auditions || 0, color: CORAL_SOFT },
          { label: "Booked", value: s.total_booked || 0, color: GREEN },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, background: BG_CARD, borderRadius: 16, padding: "16px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: "-1px", fontFamily: "'Playfair Display', serif", display: "block" }}>{stat.value}</span>
            <span style={{ fontSize: 11, color: TEXT_SECONDARY, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Token balance */}
      {balance !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, background: 'rgba(167,236,218,0.06)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(167,236,218,0.1)' }}>
          <span style={{ fontSize: 16 }}>🎟️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#A7ECDA' }}>{balance}</span>
            <span style={{ fontSize: 12, color: '#8a9a96' }}> AI tokens remaining</span>
          </div>
          {balance === 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#C855F0', background: 'rgba(200,85,240,0.15)', padding: '3px 10px', borderRadius: 20 }}>
              Upgrade
            </span>
          )}
        </div>
      )}

      {/* Upcoming Callbacks */}
      {callbacks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: 0, letterSpacing: "-0.2px" }}>Upcoming Callbacks</h2>
            <button onClick={() => setTab("auditions")} style={{ background: "none", border: "none", color: CORAL, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>See all</button>
          </div>
          {callbacks.map(a => {
            const cb = callbackBadge(a.callbackDate);
            return (
              <div key={a.id} style={{
                background: BG_CARD, borderRadius: 14, padding: "16px", marginBottom: 10,
                border: cb?.urgent ? `1px solid ${CORAL}35` : `1px solid ${BORDER}`,
                boxShadow: cb?.urgent ? `0 0 24px ${CORAL}12` : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>{a.project}</p>
                    <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "2px 0 0" }}>as {a.character} · {a.cd}</p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                    background: cb?.urgent ? CORAL_DIM : GOLD_DIM,
                    color: cb?.urgent ? CORAL : GOLD,
                  }}>{cb?.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}



      {/* Recent Scripts */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: 0, letterSpacing: "-0.2px" }}>Continue Practicing</h2>
          <button onClick={() => setTab("scenes")} style={{ background: "none", border: "none", color: CORAL, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>All scripts</button>
        </div>
        {scripts.slice(0, 2).map(sc => (
          <div key={sc.id} style={{ background: BG_CARD, borderRadius: 14, padding: "14px 16px", marginBottom: 12, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <ProgressRing pct={sc.progress} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title}</p>
              <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "2px 0 0" }}>{sc.pages}{sc.lastPracticed ? ` · ${sc.lastPracticed}` : ""}</p>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: CORAL_DIM, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="play" size={16} color={CORAL} />
            </div>
          </div>
        ))}
      </div>
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
    <div style={{ padding: "0 16px 24px" }}>
      <div style={{ padding: "20px 0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, fontFamily: "'Playfair Display', serif" }}>Auditions</h1>
        <button onClick={() => setShowAddForm(true)} style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg, ${CORAL}, #e06e6c)`, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="plus" size={18} color="#fff" />
        </button>
      </div>

      {/* Add Audition Modal */}
      {showAddForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", padding: 16 }}>
          <div style={{ background: BG_CARD, borderRadius: 20, border: `1px solid ${BORDER_ACTIVE}`, width: "100%", maxWidth: 400, maxHeight: "85vh", overflow: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>Add Audition</h2>
              <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", color: TEXT_MUTED, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>
            {/* Scan Screenshot Button */}
            <button
              type="button"
              onClick={() => scanInputRef.current?.click()}
              disabled={scanLoading}
              style={{
                width: "100%", padding: "14px", borderRadius: 14, cursor: "pointer",
                background: "linear-gradient(135deg, rgba(200,85,240,0.12), rgba(167,236,218,0.08))",
                border: `1.5px dashed rgba(200,85,240,0.4)`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                marginBottom: 20, transition: "all 0.2s",
              }}
            >
              {scanLoading ? (
                <span style={{ fontSize: 13, fontWeight: 600, color: MINT }}>Scanning with AI...</span>
              ) : (
                <>
                  <span style={{ fontSize: 18 }}>📸</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>Scan Screenshot with AI</span>
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
                  <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_SECONDARY, display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input
                    value={addForm[f.key]}
                    onChange={(e) => setAddForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER_ACTIVE}`, background: BG_ELEVATED, color: TEXT_PRIMARY, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_SECONDARY, display: "block", marginBottom: 6 }}>Project Type</label>
                <select
                  value={addForm.project_type}
                  onChange={(e) => setAddForm(prev => ({ ...prev, project_type: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER_ACTIVE}`, background: BG_ELEVATED, color: TEXT_PRIMARY, fontSize: 14, outline: "none" }}
                >
                  {[["film","Film/TV"],["commercial","Commercial"],["theatrical","Theatrical"],["voiceover","Voiceover"],["theater","Theater"]].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_SECONDARY, display: "block", marginBottom: 6 }}>Callback Date</label>
                <input
                  type="date"
                  value={addForm.callback_date}
                  onChange={(e) => setAddForm(prev => ({ ...prev, callback_date: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER_ACTIVE}`, background: BG_ELEVATED, color: TEXT_PRIMARY, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_SECONDARY, display: "block", marginBottom: 6 }}>Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any additional details..."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER_ACTIVE}`, background: BG_ELEVATED, color: TEXT_PRIMARY, fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box" }}
                />
              </div>
              <button
                type="submit"
                disabled={addSaving || !addForm.project.trim()}
                style={{
                  width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: `linear-gradient(135deg, ${CORAL}, #e06e6c)`, color: "#fff",
                  fontSize: 15, fontWeight: 700, opacity: addSaving || !addForm.project.trim() ? 0.5 : 1,
                }}
              >
                {addSaving ? "Saving..." : "Add Audition"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${BORDER}`, paddingBottom: 14 }}>
        {[{ key: "tracker", label: "Tracker" }, { key: "submissions", label: "Submissions" }].map(sec => (
          <button key={sec.key} onClick={() => setViewSection(sec.key)} style={{
            padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600,
            background: viewSection === sec.key ? CORAL : "transparent",
            color: viewSection === sec.key ? "#fff" : TEXT_MUTED,
          }}>
            {sec.label}
          </button>
        ))}
      </div>

      {viewSection === "submissions" ? (
        <div>
          {submissions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: TEXT_MUTED, fontSize: 13, letterSpacing: "0.2px" }}>No submissions yet — start tracking your work.</div>
          ) : submissions.map(sub => {
            const statusColor = { sent: BLUE, viewed: "#b89aff", callback: GOLD, booked: GREEN }[sub.status] || TEXT_MUTED;
            return (
              <div key={sub.id} style={{
                background: BG_CARD, borderRadius: 14, padding: "16px", marginBottom: 12,
                border: `1px solid ${BORDER}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{sub.project_name || "Untitled"}</p>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 10, marginLeft: 8,
                    background: `${statusColor}18`, color: statusColor, textTransform: "capitalize", whiteSpace: "nowrap",
                  }}>{sub.status || "sent"}</span>
                </div>
                <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 8px" }}>
                  {sub.role || ""}{sub.casting_director ? ` · ${sub.casting_director}` : ""}
                </p>
                <button onClick={() => dispatch(promoteToAuditionThunk({ id: sub.id }))} style={{
                  background: GOLD_DIM, border: `1px solid ${GOLD}30`, borderRadius: 10,
                  padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: GOLD,
                  width: "100%", transition: "all 0.15s",
                }}>
                  🎬  I Got an Audition
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <>
      {/* Filter Pills — Coral active, Mint tint on hover */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {types.map(t => {
          const count = t.key === "all" ? auditions.length : auditions.filter(a => a.type === t.key).length;
          const active = filter === t.key;
          return (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap",
              fontSize: 13, fontWeight: 600,
              background: active ? CORAL : BG_ELEVATED,
              color: active ? "#fff" : TEXT_SECONDARY,
              transition: "all 0.15s",
            }}>
              {t.label} <span style={{ opacity: 0.6, marginLeft: 3 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Kanban */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, scrollSnapType: "x mandatory" }}>
        {columns.map(col => {
          const items = filtered.filter(a => a.status === col.id);
          return (
            <div key={col.id} style={{ minWidth: 230, flex: "0 0 230px", scrollSnapAlign: "start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 4px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[col.id] }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.5px" }}>{col.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, background: "rgba(167,236,218,0.06)", padding: "2px 7px", borderRadius: 10, marginLeft: "auto" }}>{items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 120, background: "rgba(167,236,218,0.02)", borderRadius: 14, padding: 8 }}>
                {items.map(a => {
                  const cb = callbackBadge(a.callbackDate);
                  return (
                    <div key={a.id} onClick={() => setSelected(a)} style={{
                      background: BG_CARD, borderRadius: 14, padding: "13px 15px", cursor: "pointer",
                      border: cb?.urgent ? `1px solid ${CORAL}30` : `1px solid ${BORDER}`,
                      boxShadow: cb?.urgent ? `0 0 20px ${CORAL}0d` : "none",
                      transition: "transform 0.15s, border-color 0.15s",
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.3 }}>{a.project}</p>
                      <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: "3px 0 0" }}>as {a.character}</p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                          background: `${TYPE_COLORS[a.type]}15`, color: TYPE_COLORS[a.type],
                          textTransform: "uppercase", letterSpacing: "0.5px",
                        }}>{a.type}</span>
                        {cb && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                            background: cb.urgent ? CORAL_DIM : GOLD_DIM,
                            color: cb.urgent ? CORAL : GOLD,
                          }}>{cb.text}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, fontSize: 12, color: TEXT_MUTED }}>
                    Nothing here yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet Detail */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100 }} />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, maxHeight: "85vh", zIndex: 101,
            background: BG_DEEP, borderRadius: "20px 20px 0 0", padding: "8px 20px 32px",
            overflowY: "auto", animation: "slideUp 0.3s ease",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(167,236,218,0.15)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, fontFamily: "'Playfair Display', serif" }}>{selected.project}</h2>
                <p style={{ fontSize: 14, color: TEXT_SECONDARY, margin: "4px 0 0" }}>as {selected.character}</p>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 20,
                background: `${STATUS_COLORS[selected.status]}18`, color: STATUS_COLORS[selected.status],
                textTransform: "capitalize",
              }}>{selected.status.replace("_", " ")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Casting director", value: selected.cd },
                { label: "Agency", value: selected.agency },
                { label: "Type", value: selected.type },
                { label: "Callback", value: selected.callbackDate || "—" },
              ].map(f => (
                <div key={f.label} style={{ background: BG_CARD, borderRadius: 12, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, color: TEXT_MUTED, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{f.label}</p>
                  <p style={{ fontSize: 14, color: TEXT_PRIMARY, margin: "4px 0 0", fontWeight: 500 }}>{f.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${BORDER_ACTIVE}`, background: BG_ELEVATED, color: TEXT_PRIMARY, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Edit</button>
              <button style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${CORAL}, #e06e6c)`, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Move status</button>
            </div>
          </div>
        </>
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
        // Check cache first — avoids re-calling GPT on same PDF content
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
      } catch {
        setPdfLoading(false);
        return;
      }
      setPdfLoading(false);
    } else {
      content = await file.text();
    }

    if (content && content.trim()) {
      dispatch(createScriptThunk({ title, content: content.trim() }));
    }
  };

  if (selectedScript) {
    sessionStorage.setItem('preloadedScript', JSON.stringify({ scriptContent: selectedScript.content }));
    return (
      <div style={{ height: "calc(100vh - 64px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid rgba(167,236,218,0.06)", flexShrink: 0 }}>
          <button onClick={() => setSelectedScript(null)} style={{
            width: 36, height: 36, borderRadius: 10, background: "#1a1c26",
            border: "1px solid rgba(167,236,218,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <Icon name="back" size={18} color="#8a9a96" />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#f2f0ed", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedScript.title}</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 24px", WebkitOverflowScrolling: "touch" }}>
          <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}><div style={{ fontSize: 13, color: "#8a9a96" }}>Loading...</div></div>}>
            <SceneStudy key={selectedScript.id} />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 24px" }}>
      <div style={{ padding: "20px 0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, fontFamily: "'Playfair Display', serif" }}>Scene Study</h1>
        <button style={{ width: 38, height: 38, borderRadius: 10, background: BG_ELEVATED, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="search" size={18} color={TEXT_SECONDARY} />
        </button>
      </div>

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
              <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: 0 }}>{pdfLoading ? "Parsing PDF..." : "Saving..."}</p>
            </div>
          ) : (
            <>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: `${MINT}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Icon name="plus" size={22} color={MINT} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: 0, letterSpacing: "-0.2px" }}>Add a Script</p>
              <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "6px 0 0", letterSpacing: "0.2px" }}>Upload PDF or paste text</p>
            </>
          )}
        </div>
        <input id="script-upload-input" ref={fileInputRef} type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={e => handleFileUpload(e.target.files?.[0])} />
      </label>

      <p style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "1px" }}>Your Scripts</p>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <>
          <div onClick={() => setConfirmDelete(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100 }} />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 101,
            background: BG_DEEP, borderRadius: "20px 20px 0 0", padding: "20px 20px 40px",
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(167,236,218,0.15)", margin: "0 auto 20px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, margin: "0 0 6px", textAlign: "center" }}>Delete Script?</p>
            <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "0 0 24px", textAlign: "center" }}>
              "{confirmDelete.title}" will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: "14px", borderRadius: 14, border: `1px solid ${BORDER_ACTIVE}`,
                background: BG_ELEVATED, color: TEXT_PRIMARY, fontSize: 14, fontWeight: 600, cursor: "pointer",
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
          background: deletingId === sc.id ? "rgba(239,68,68,0.08)" : BG_CARD,
          borderRadius: 14, padding: "16px", marginBottom: 10,
          border: deletingId === sc.id ? "1px solid rgba(239,68,68,0.3)" : `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", gap: 14,
          opacity: deletingId === sc.id ? 0.5 : 1,
          transition: "all 0.2s",
        }}>
          <div onClick={() => setSelectedScript(sc)} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, cursor: "pointer" }}>
            <ProgressRing pct={sc.progress} size={44} stroke={3} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title}</p>
              <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "3px 0 0" }}>{sc.pages}{sc.lastPracticed ? ` · Last practiced ${sc.lastPracticed}` : ""}</p>
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
  plus: { label: 'Plus', emoji: '⭐', color: '#C855F0', bg: 'rgba(200,85,240,0.12)' },
  premium: { label: 'Premium', emoji: '👑', color: '#FCE072', bg: 'rgba(252,224,114,0.12)' },
};

function ProfileScreen({ setCurrentPanel }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth?.user);
  const profileData = useSelector((state) => state.profile?.profile);
  const statsData = useSelector((state) => state.auditions.stats?.data);
  const scripts = useSelector((state) => state.sceneStudyScripts.scripts || []);
  const userName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Actor";
  const userEmail = user?.email || "";
  const initials = userName ? userName.charAt(0).toUpperCase() : "A";
  const auditionCount = statsData?.total_auditions || 0;
  const bookedCount = statsData?.total_booked || 0;
  const scriptsCount = scripts.length || 0;

  const headshot = profileData?.user_image || profileData?.headshot || null;
  const union = profileData?.actor_profile?.union || null;
  const basedIn = profileData?.actor_profile?.based_in || profileData?.based_in || null;
  const genres = profileData?.actor_profile?.genres || profileData?.genres || [];
  const yearsExperience = profileData?.actor_profile?.years_experience || profileData?.years_experience || null;

  const [subStatus, setSubStatus] = useState(null);

  useEffect(() => {
    dispatch(fetchProfileThunk());
    axiosInstance.get('/v1/subscriptions/status/').then(res => setSubStatus(res.data.data)).catch(() => {});
  }, [dispatch]);

  const menu = [
    { label: "Edit Profile", icon: "profile", action: () => setCurrentPanel("dash-profile") },
    { label: "Membership", icon: "star", action: () => setCurrentPanel("membership") },
    { label: "Reports", icon: "auditions", action: () => setCurrentPanel("reports") },
    { label: "Log Out", icon: "logout", action: () => dispatch(logoutUser()), danger: true },
  ];

  return (
    <div style={{ padding: "0 16px 32px" }}>
      <div style={{ padding: "24px 0 32px", textAlign: "center" }}>
        {/* Avatar — headshot with brand gradient overlay */}
        <div style={{ width: 84, height: 84, borderRadius: "50%", margin: "0 auto 16px", position: "relative", overflow: "hidden" }}>
          {headshot ? (
            <>
              <img src={headshot} alt="Headshot" onError={(e) => e.target.style.display = 'none'} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(200,85,240,0.25) 0%, transparent 50%, rgba(167,236,218,0.18) 100%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "inset 0 0 0 1.5px rgba(200,85,240,0.4)", pointerEvents: "none" }} />
            </>
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: `linear-gradient(135deg, ${MINT}, ${CORAL_SOFT}, ${CORAL})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 700, color: BG_DEEPEST, fontFamily: "'Playfair Display', serif",
            }}>{initials}</div>
          )}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>{userName}</h1>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>{userEmail}</p>
        {(union || basedIn) && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
            {union && (
              <span style={{ fontSize: 12, fontWeight: 600, color: MINT, padding: "4px 12px", borderRadius: 20, background: MINT_DIM }}>{union}</span>
            )}
            {basedIn && (
              <span style={{ fontSize: 12, color: TEXT_SECONDARY, padding: "4px 12px", borderRadius: 20, background: BG_ELEVATED }}>📍 {basedIn}</span>
            )}
          </div>
        )}
        {/* Subscription badge + token balance */}
        {subStatus?.plan && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
            {(() => {
              const badge = PLAN_BADGES[subStatus.plan];
              return badge ? (
                <span style={{
                  fontSize: 12, fontWeight: 700, color: badge.color,
                  padding: '5px 14px', borderRadius: 20, background: badge.bg,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  {badge.emoji} {badge.label}
                </span>
              ) : null;
            })()}
            <span style={{
              fontSize: 12, fontWeight: 600, color: '#A7ECDA',
              padding: '5px 14px', borderRadius: 20,
              background: 'rgba(167,236,218,0.08)',
              border: '1px solid rgba(167,236,218,0.2)',
            }}>
              {subStatus.balance ?? 0} tokens
            </span>
          </div>
        )}

      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[{ n: auditionCount, l: "Auditions" }, { n: bookedCount, l: "Booked" }, { n: scriptsCount, l: "Scripts" }].map(s => (
          <div key={s.l} style={{ flex: 1, textAlign: "center", background: BG_CARD, borderRadius: 14, padding: "16px 8px", border: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, fontFamily: "'Playfair Display', serif" }}>{s.n}</p>
            <p style={{ fontSize: 11, color: TEXT_SECONDARY, margin: "2px 0 0" }}>{s.l}</p>
          </div>
        ))}
      </div>

      <div style={{ background: BG_CARD, borderRadius: 18, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
        {menu.map((item, i) => (
          <div key={item.label} onClick={item.action || undefined} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", cursor: "pointer",
            borderBottom: i < menu.length - 1 ? `1px solid ${BORDER}` : "none",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: item.danger ? 'rgba(239,68,68,0.08)' : `${MINT}08`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name={item.icon} size={16} color={item.danger ? '#ef4444' : MINT} />
            </div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: item.danger ? '#ef4444' : TEXT_PRIMARY }}>{item.label}</span>
            {!item.danger && <Icon name="chevron" size={14} color={TEXT_MUTED} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MORE SCREEN — Grid of all additional features
   ═══════════════════════════════════════════════════ */
function MoreScreen({ setCurrentPanel }) {
  const dispatch = useDispatch();
  return (
    <div style={{ padding: "0 16px 32px" }}>
      <div style={{ padding: "24px 0 24px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, fontFamily: "'Playfair Display', serif" }}>More features</h1>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "6px 0 0" }}>All your tools in one place</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {MORE_FEATURES.map(f => (
          <button key={f.id} onClick={() => setCurrentPanel(f.id)} style={{
            background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 18,
            padding: "20px 16px", cursor: "pointer", textAlign: "left",
            transition: "border-color 0.15s, transform 0.15s",
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: `${f.color}14`, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, marginBottom: 10,
            }}>{f.emoji}</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.3 }}>{f.label}</p>
          </button>
        ))}
      </div>

      {/* Log Out */}
      <button
        onClick={() => dispatch(logoutUser())}
        style={{
          width: "100%", marginTop: 28, padding: "16px", borderRadius: 14,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          cursor: "pointer",
        }}
      >
        <Icon name="logout" size={18} color="#ef4444" />
        <span style={{ fontSize: 15, fontWeight: 600, color: "#ef4444" }}>Log Out</span>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PANEL SCREEN — Wraps a dashboard panel for mobile
   ═══════════════════════════════════════════════════ */
// Panels that already use dark brand styling (inline dark bg/colors)
const DARK_PANELS = new Set(["cd-sim", "generator", "find-a-reader", "green-room", "who-wants-to-read", "favorites"]);

// Wrapper to inject matchId into GreenRoomChat without React Router params
function GreenRoomChatWrapper({ matchId }) {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ fontSize: 13, color: "#8a9a96" }}>Loading...</div>
      </div>
    }>
      <GreenRoomChat matchId={matchId} />
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

function PanelScreen({ panelId, onBack }) {
  const [subPanel, setSubPanel] = useState(null); // { id: 'green-room-chat', matchId: '123' }
  const PanelComponent = PANEL_COMPONENTS[panelId];
  const feature = MORE_FEATURES.find(f => f.id === panelId);
  if (!PanelComponent) return null;

  const isDark = DARK_PANELS.has(panelId);

  // If we're in a sub-panel (e.g. GreenRoomChat or ItsAScene), render that instead
  if (subPanel?.id === 'green-room-chat') {
    return (
      <div style={{ padding: "0 0 24px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <button onClick={() => setSubPanel(null)} style={{
            width: 36, height: 36, borderRadius: 10, background: BG_ELEVATED,
            border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <Icon name="back" size={18} color={TEXT_SECONDARY} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: TEXT_PRIMARY }}>Green Room Chat</span>
        </div>
        <GreenRoomChatWrapper matchId={subPanel.matchId} />
      </div>
    );
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
    <div style={{ padding: "0 0 24px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "16px 16px",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 10, background: BG_ELEVATED,
          border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
          <Icon name="back" size={18} color={TEXT_SECONDARY} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: TEXT_PRIMARY }}>{feature?.label || "Feature"}</span>
      </div>
      <Suspense fallback={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>Loading...</div>
        </div>
      }>
        {isDark ? (
          <PanelComponent
            onSelectMatch={panelId === 'green-room' ? (matchId) => setSubPanel({ id: 'green-room-chat', matchId }) : undefined}
            onMatchNavigate={panelId === 'who-wants-to-read' ? (matchId) => setSubPanel({ id: 'its-a-scene', matchId }) : undefined}
          />
        ) : (
          <div style={{
            background: BG_CARD, borderRadius: 16, margin: "12px 8px 0",
            padding: 12, minHeight: 200,
          }}>
            <PanelComponent
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
   APP SHELL — Mobile + Desktop
   ═══════════════════════════════════════════════════ */
export default function DrSelfTapeApp() {
  const [tab, setTab] = useState("home");
  const [currentPanel, setCurrentPanel] = useState(null);
  const [isMobile, setIsMobile] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showNoTokens, setShowNoTokens] = useState(false);

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

  useEffect(() => {
    const handler = () => setShowNoTokens(true);
    window.addEventListener('insufficient_tokens', handler);
    return () => window.removeEventListener('insufficient_tokens', handler);
  }, []);

  // Listen for cross-component mobile navigation (e.g. Generator → Scene Study)
  useEffect(() => {
    const handler = (e) => {
      const { tab: targetTab, panel: targetPanel } = e.detail || {};
      if (targetTab) {
        setCurrentPanel(null);
        setTab(targetTab);
      } else if (targetPanel) {
        setCurrentPanel(targetPanel);
      }
    };
    window.addEventListener('drst-navigate', handler);
    return () => window.removeEventListener('drst-navigate', handler);
  }, []);

  const handleSetTab = (id) => {
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
    profile: <ProfileScreen setCurrentPanel={setCurrentPanel} />,
    more: <MoreScreen setCurrentPanel={setCurrentPanel} />,
  };

  return (
    <div style={{ background: BG_DEEP, minHeight: "100vh", fontFamily: "'Poppins', sans-serif", color: TEXT_PRIMARY }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet" />
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
              background: ['#C855F0', '#A7ECDA', '#FCE072', '#FFB49A', '#5ee6b8', '#ffffff'][i % 6],
              animation: `confettiFall ${1.5 + (i % 4) * 0.4}s ease-in ${(i % 8) * 0.15}s forwards`,
              transform: `rotate(${i * 15}deg)`,
            }} />
          ))}
          {/* Modal */}
          <div style={{
            position: 'absolute', bottom: 80, left: 16, right: 16,
            background: 'linear-gradient(145deg, #1a0d24, #0f0f1a)',
            border: '1px solid rgba(200,85,240,0.5)',
            borderRadius: 24, padding: '28px 24px', textAlign: 'center',
            animation: 'celebrationPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
            boxShadow: '0 0 60px rgba(200,85,240,0.3)',
            pointerEvents: 'all',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f2f0ed', margin: '0 0 8px', fontFamily: "'Playfair Display', serif" }}>
              Welcome to Dr Self Tape
            </h2>
            <p style={{ fontSize: 14, color: '#8a9a96', margin: '0 0 20px', lineHeight: 1.5 }}>
              Your membership is active. Tokens are ready to use.
            </p>
            <button
              onClick={() => setShowCelebration(false)}
              style={{
                background: 'linear-gradient(135deg, #C855F0, #9333ea)',
                border: 'none', borderRadius: 14, padding: '14px 32px',
                fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer',
                width: '100%',
              }}
            >
              Start Rehearsing 🎭
            </button>
          </div>
        </div>
      )}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
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
        <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
          {/* Top Bar */}
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
            background: `${BG_DEEP}ee`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            padding: "env(safe-area-inset-top, 0px) 16px 0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            height: "calc(50px + env(safe-area-inset-top, 0px))",
            borderBottom: `1px solid ${BORDER}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Logo */}
              <img src={logo} alt="Dr Self Tape" style={{ width: 30, height: 30, objectFit: "contain" }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, letterSpacing: "-0.3px" }}>Dr Self Tape</span>
            </div>
            <NotificationBell onNavigate={({ panel, tab }) => {
              if (panel) setCurrentPanel(panel);
              if (tab) { setCurrentPanel(null); setTab(tab); }
            }} />
          </div>

          {/* Logo watermark */}
          <div style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", zIndex: 0, opacity: 0.025,
          }}>
            <img src={logo} alt="" style={{ width: 300, height: "auto", userSelect: "none" }} draggable={false} />
          </div>

          {/* Scrollable Content Area — sits between fixed top and bottom bars */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            marginTop: "calc(50px + env(safe-area-inset-top, 0px))",
            marginBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
            WebkitOverflowScrolling: "touch",
            position: "relative", zIndex: 1,
          }}>
            {currentPanel ? (
              <PanelScreen panelId={currentPanel} onBack={() => setCurrentPanel(null)} />
            ) : (
              screens[tab]
            )}
          </div>

          {/* Bottom Tab Bar */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
            background: `${BG_DEEPEST}f8`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid ${BORDER}`,
            display: "flex", justifyContent: "space-around", alignItems: "center",
            paddingBottom: "env(safe-area-inset-bottom, 8px)", paddingTop: 8,
            height: "calc(60px + env(safe-area-inset-bottom, 0px))",
          }}>
            {TABS.map(t => {
              const a = tab === t.id && !currentPanel;
              return (
                <button key={t.id} onClick={() => handleSetTab(t.id)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 12px",
                }}>
                  <Icon name={t.icon} size={22} color={a ? CORAL : TEXT_MUTED} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: a ? CORAL : TEXT_MUTED }}>{t.label}</span>
                  {a && <div style={{ width: 4, height: 4, borderRadius: "50%", background: CORAL, marginTop: -1 }} />}
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
