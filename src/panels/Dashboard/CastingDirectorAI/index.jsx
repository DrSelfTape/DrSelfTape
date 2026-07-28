import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "../../../redux/http";
import endPoints from "../../../redux/constant";
import useAIGate from "../../../components/AIConsent/useAIGate";

const MINT = "var(--aurora-mint)";
const MINT_DIM = "rgba(167,236,218,0.10)";
const GOLD = "var(--aurora-heritage-gold)";
const GOLD_DIM = "rgba(252,224,114,0.10)";
const CORAL_SOFT = "var(--aurora-peach)";
const CORAL = "var(--aurora-rose)";
const CORAL_DIM = "rgba(255, 130, 128,0.10)";
const BG_DEEP = "var(--aurora-bg)";
const BG_CARD = "var(--aurora-glass)";
const BG_ELEVATED = "var(--aurora-surface-solid)";
const BG_INPUT = "var(--aurora-glass-strong)";
const BORDER = "var(--aurora-line)";
const BORDER_ACTIVE = "rgba(212,168,95,0.28)";
const TEXT = "var(--aurora-text)";
const TEXT2 = "var(--aurora-sub)";
const TEXT3 = "var(--aurora-dim)";
const PURPLE = "var(--aurora-purple)";
const GREEN = "var(--aurora-mint)";

function Ic({ d, size = 20, color = TEXT2 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}
const icons = {
  breakdown: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  rehearse: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
  notes: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  prep: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  generate: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  back: "M15 19l-7-7 7-7",
  play: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z",
  chevron: "M9 5l7 7-7 7",
  light: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  wardrobe: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  target: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  camera: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z",
};

const MODES = [
  { id: "breakdown", label: "Scene breakdown", icon: icons.breakdown, color: MINT, desc: "Beats, tactics, subtext" },
  { id: "rehearse", label: "Live rehearsal", icon: icons.rehearse, color: GOLD, desc: "AI scene partner" },
  { id: "notes", label: "CD notes", icon: icons.notes, color: CORAL, desc: "Performance feedback" },
  { id: "prep", label: "Audition prep", icon: icons.prep, color: PURPLE, desc: "Wardrobe, light, framing" },
  { id: "generate", label: "Scene generator", icon: icons.generate, color: CORAL_SOFT, desc: "Custom scenes" },
];

/* mock data */
const SCENE_TEXT = `INT. INTERROGATION ROOM - NIGHT

DETECTIVE CRUZ sits across from MAYA, a young woman in a worn leather jacket. A single overhead light buzzes.

CRUZ
You were at the warehouse. We have footage.

MAYA
(steady)
I was picking up a friend.

CRUZ
At 2 AM. In a building that's been condemned since March.

MAYA
(leaning forward)
My friend doesn't keep regular hours.

CRUZ
Neither do the people we found moving product through the east loading dock.

A beat. Maya looks away, then back, harder now.

MAYA
I want a lawyer.`;

const BREAKDOWN_DATA = {
  objective: "Cruz needs Maya to slip: reveal whether she's a witness or an accomplice. Maya needs to survive the interrogation without incriminating herself or her contact.",
  characters: [
    { name: "Detective Cruz", motivation: "Seeking confession or leverage; under pressure from superiors", tactic: "Strategic escalation: starts calm, introduces evidence incrementally", archetype: "The Persistent Interrogator" },
    { name: "Maya", motivation: "Self-preservation; protecting someone she cares about", tactic: "Deflection through composure until cornered, then retreats to legal shield", archetype: "The Cornered Loyalist" },
  ],
  beats: [
    { id: 1, line: "You were at the warehouse.", beat: "Opening gambit", tactic: "Establish fact, test reaction", emotion: "Controlled authority", intensity: 3 },
    { id: 2, line: "I was picking up a friend.", beat: "First deflection", tactic: "Casual dismissal", emotion: "Practiced calm", intensity: 2 },
    { id: 3, line: "At 2 AM. In a building that's been condemned.", beat: "Evidence squeeze", tactic: "Corner with specifics", emotion: "Rising pressure", intensity: 5 },
    { id: 4, line: "My friend doesn't keep regular hours.", beat: "Defiant pushback", tactic: "Wit as shield", emotion: "Confidence masking fear", intensity: 4 },
    { id: 5, line: "Neither do the people moving product.", beat: "The reveal", tactic: "Implication without accusation", emotion: "Calculated threat", intensity: 7 },
    { id: 6, line: "I want a lawyer.", beat: "Wall goes up", tactic: "Legal retreat", emotion: "Fear breaking through composure", intensity: 8 },
  ],
  subtext: "The scene is really about trust. Maya trusted someone who put her in this room. Cruz senses Maya isn't a criminal but needs her to flip. Every line is a negotiation neither can afford to lose.",
  arc: "Tension builds through a slow escalation from 3→8. The key turn is Beat 5 when Cruz drops 'moving product'. Maya's composure fractures and the audience sees her real vulnerability.",
};

const NOTES_DATA = [
  { line: "I was picking up a friend.", score: 7, note: "Good instinct to stay flat here. Try a micro-beat before 'friend': a half-second where you consider lying vs. telling the truth. Let us see the choice.", type: "adjustment" },
  { line: "My friend doesn't keep regular hours.", score: 8, note: "The lean-in is working. This is where Maya shows teeth. You could push it further: let a small smile escape. She's almost enjoying outmaneuvering Cruz.", type: "positive" },
  { line: "I want a lawyer.", score: 6, note: "This landed too flat. This is the most emotionally loaded moment in the scene. Maya is giving up the fight. We need to see the cost. Try: hold eye contact with Cruz for a full beat, then look down, then say the line quieter than everything before it.", type: "redirect" },
];

const PREP_DATA = {
  wardrobe: {
    suggestion: "Worn leather jacket (character-specific), dark solid tee underneath. No patterns, no logos. Jewelry: one small stud earring or thin chain, something personal Maya would actually wear. Hair slightly undone. She's been sitting here for hours.",
    avoid: "Bright colors, business wear, anything too polished. Maya isn't put-together right now.",
    colorPalette: ["var(--aurora-text)", "var(--aurora-heritage-gold-deep)", "var(--aurora-sky)", "var(--aurora-peach)"],
  },
  lighting: {
    setup: "Single overhead key light (harsh, slightly warm). This is an interrogation room. The light should feel institutional and unflattering. If self-taping at home: position one light directly above and slightly in front. No fill light. Let shadows form under your eyes and jaw.",
    background: "Solid neutral gray or dark blue. No texture, no visible furniture. The room should feel empty and cold.",
    eyeline: "Camera at eye level. Reader sits directly behind camera. This is an intimate two-person scene, so keep your eyeline just barely off-lens.",
  },
  framing: {
    shot: "Medium close-up, chest to top of head. Tighter is better for this scene. The performance lives in micro-expressions.",
    movement: "Minimal. Maya is physically contained. The lean-forward on 'My friend doesn't keep regular hours' is the one physical choice. Make it count by being still everywhere else.",
  },
  slate: "State your name, then pause. Don't rush into the scene. Take a breath after slate. Let the casting director see you transform into Maya.",
};

function Badge({ text, color }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: `${color}15`, color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {text}
    </span>
  );
}

function IntensityBar({ value, max = 10 }) {
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: max }, (_, i) => (
        <div key={i} style={{ width: 6, height: i < value ? 12 + i : 8, borderRadius: 2, background: i < value ? (i < 4 ? MINT : i < 7 ? GOLD : CORAL) : `${TEXT3}40`, transition: "all 0.3s" }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   HUB — Mode Selection
   ═══════════════════════════════════════════════════ */
function HubScreen({ setMode }) {
  return (
    <div>
      <div style={{ textAlign: "center", padding: "28px 0 8px" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: CORAL_DIM, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", border: `1px solid ${CORAL}20` }}>
          <Ic d={icons.star} size={28} color={CORAL} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0, fontFamily: "'Playfair Display', serif" }}>Casting Director AI</h1>
        <p style={{ fontSize: 13, color: TEXT2, margin: "6px 0 0", maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}>Your AI acting instructor: scene analysis, live rehearsal, performance notes, and audition prep</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
        {MODES.map((m, i) => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
            background: BG_CARD, borderRadius: 16, border: `1px solid ${BORDER}`,
            cursor: "pointer", textAlign: "left", transition: "border-color 0.15s",
            animation: `fadeIn 0.3s ease ${i * 0.06}s both`,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${m.color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Ic d={m.icon} size={22} color={m.color} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: TEXT, margin: 0 }}>{m.label}</p>
              <p style={{ fontSize: 12, color: TEXT2, margin: "2px 0 0" }}>{m.desc}</p>
            </div>
            <Ic d={icons.chevron} size={16} color={TEXT3} />
          </button>
        ))}
      </div>

      {/* Quick Start CTA */}
      <div style={{ marginTop: 24, background: BG_CARD, borderRadius: 18, padding: "20px", border: `1px solid ${BORDER}`, textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: "0 0 4px" }}>Quick start</p>
        <p style={{ fontSize: 12, color: TEXT2, margin: "0 0 14px" }}>Paste a scene and get a full breakdown instantly</p>
        <button onClick={() => setMode("breakdown")} style={{
          padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
          background: `linear-gradient(135deg, ${CORAL}, var(--aurora-accent-deep))`, color: "#fff",
          fontSize: 14, fontWeight: 600,
        }}>Analyze a scene</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCENE BREAKDOWN
   ═══════════════════════════════════════════════════ */
function BreakdownScreen() {
  const [step, setStep] = useState(0); // 0=input, 1=analyzing, 2=results
  const [expandedBeat, setExpandedBeat] = useState(null);

  const startAnalysis = () => {
    setStep(1);
    setTimeout(() => setStep(2), 2000);
  };

  if (step === 0) return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 6px", fontFamily: "'Playfair Display', serif" }}>Scene breakdown</h2>
      <p style={{ fontSize: 13, color: TEXT2, margin: "0 0 20px" }}>Paste your scene or upload a PDF for AI analysis</p>
      <textarea defaultValue={SCENE_TEXT} style={{
        width: "100%", minHeight: 220, background: BG_INPUT, border: `1px solid ${BORDER_ACTIVE}`,
        borderRadius: 14, padding: 16, color: TEXT, fontSize: 13, fontFamily: "monospace",
        resize: "vertical", outline: "none", lineHeight: 1.6,
      }} />
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${BORDER_ACTIVE}`, background: BG_ELEVATED, color: TEXT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Upload PDF</button>
        <button onClick={startAnalysis} style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${MINT}, ${GREEN})`, color: "var(--aurora-text)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Analyze scene</button>
      </div>
    </div>
  );

  if (step === 1) return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${MINT}30`, borderTopColor: MINT, animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: TEXT, margin: 0 }}>Analyzing scene...</p>
      <p style={{ fontSize: 12, color: TEXT2, margin: "6px 0 0" }}>Mapping beats, tactics, and emotional arcs</p>
    </div>
  );

  const d = BREAKDOWN_DATA;
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 20px", fontFamily: "'Playfair Display', serif" }}>Scene breakdown</h2>

      {/* Scene Objective */}
      <div style={{ background: MINT_DIM, borderRadius: 14, padding: "16px 18px", marginBottom: 14, borderLeft: `3px solid ${MINT}`, borderLeftRadius: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: MINT, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Scene objective</p>
        <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>{d.objective}</p>
      </div>

      {/* Characters */}
      <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: "20px 0 10px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Characters</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {d.characters.map((c, i) => (
          <div key={c.name} style={{ flex: 1, background: BG_CARD, borderRadius: 14, padding: "14px", border: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? CORAL_DIM : MINT_DIM, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? CORAL : MINT }}>{c.name[0]}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{c.name}</span>
            </div>
            <Badge text={c.archetype} color={i === 0 ? CORAL : MINT} />
            <p style={{ fontSize: 12, color: TEXT2, margin: "8px 0 0", lineHeight: 1.5 }}>{c.motivation}</p>
            <p style={{ fontSize: 11, color: TEXT3, margin: "4px 0 0", fontStyle: "italic" }}>Tactic: {c.tactic}</p>
          </div>
        ))}
      </div>

      {/* Beat Map */}
      <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Beat map</p>
      {d.beats.map(b => {
        const expanded = expandedBeat === b.id;
        return (
          <div key={b.id} onClick={() => setExpandedBeat(expanded ? null : b.id)} style={{
            background: BG_CARD, borderRadius: 12, padding: "12px 14px", marginBottom: 8,
            border: expanded ? `1px solid ${GOLD}30` : `1px solid ${BORDER}`,
            cursor: "pointer", transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT3, width: 20 }}>#{b.id}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: 0 }}>"{b.line}"</p>
                <p style={{ fontSize: 11, color: TEXT2, margin: "2px 0 0" }}>{b.beat}</p>
              </div>
              <IntensityBar value={b.intensity} />
            </div>
            {expanded && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><p style={{ fontSize: 10, color: TEXT3, margin: 0, textTransform: "uppercase" }}>Tactic</p><p style={{ fontSize: 12, color: GOLD, margin: "2px 0 0", fontWeight: 500 }}>{b.tactic}</p></div>
                <div><p style={{ fontSize: 10, color: TEXT3, margin: 0, textTransform: "uppercase" }}>Emotion</p><p style={{ fontSize: 12, color: CORAL_SOFT, margin: "2px 0 0", fontWeight: 500 }}>{b.emotion}</p></div>
              </div>
            )}
          </div>
        );
      })}

      {/* Subtext */}
      <div style={{ background: GOLD_DIM, padding: "16px 18px", marginTop: 16, borderLeft: `3px solid ${GOLD}` }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: GOLD, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Subtext</p>
        <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6, fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>{d.subtext}</p>
      </div>

      {/* Arc Summary */}
      <div style={{ background: BG_CARD, borderRadius: 14, padding: "16px 18px", marginTop: 14, border: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Emotional arc</p>
        <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>{d.arc}</p>
        <div style={{ display: "flex", alignItems: "end", gap: 4, marginTop: 12, height: 40 }}>
          {d.beats.map(b => (
            <div key={b.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: "100%", height: b.intensity * 4, borderRadius: 3, background: b.intensity < 4 ? MINT : b.intensity < 7 ? GOLD : CORAL, transition: "height 0.5s ease" }} />
              <span style={{ fontSize: 9, color: TEXT3 }}>#{b.id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CD NOTES
   ═══════════════════════════════════════════════════ */
function NotesScreen() {
  const sessionFeedback = useSelector((state) => state.sceneStudyScripts?.audioData) || [];
  const notesData = sessionFeedback.length > 0 ? sessionFeedback : NOTES_DATA;
  const [overall] = useState(7.2);
  const typeColors = { positive: GREEN, adjustment: GOLD, redirect: CORAL };
  const typeLabels = { positive: "Strong choice", adjustment: "Adjust", redirect: "Redirect" };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 6px", fontFamily: "'Playfair Display', serif" }}>CD notes</h2>
      <p style={{ fontSize: 13, color: TEXT2, margin: "0 0 20px" }}>Performance feedback on your last take</p>

      {/* Overall Score */}
      <div style={{ background: BG_CARD, borderRadius: 18, padding: "20px", marginBottom: 20, border: `1px solid ${BORDER}`, textAlign: "center" }}>
        <p style={{ fontSize: 11, color: TEXT3, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>Overall performance</p>
        <span style={{ fontSize: 48, fontWeight: 700, color: TEXT, fontFamily: "'Playfair Display', serif" }}>{overall}</span>
        <span style={{ fontSize: 18, color: TEXT3, fontFamily: "'Playfair Display', serif" }}>/10</span>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14 }}>
          {Object.entries(typeLabels).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: typeColors[k] }} />
              <span style={{ fontSize: 11, color: TEXT2 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-line Notes */}
      {notesData.map((n, i) => (
        <div key={i} style={{
          background: BG_CARD, borderRadius: 14, padding: "16px 18px", marginBottom: 10,
          border: `1px solid ${BORDER}`, borderLeft: `3px solid ${typeColors[n.type]}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: 0, fontStyle: "italic" }}>"{n.line}"</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Badge text={typeLabels[n.type]} color={typeColors[n.type]} />
              <span style={{ fontSize: 13, fontWeight: 700, color: typeColors[n.type] }}>{n.score}/10</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: TEXT2, margin: 0, lineHeight: 1.6 }}>{n.note}</p>
        </div>
      ))}

      <button style={{
        width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", marginTop: 10,
        background: `linear-gradient(135deg, ${CORAL}, var(--aurora-accent-deep))`, color: "#fff", fontSize: 14, fontWeight: 600,
      }}>Run another take</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   AUDITION PREP
   ═══════════════════════════════════════════════════ */
function PrepScreen() {
  const [tab, setTab] = useState("wardrobe");
  const d = PREP_DATA;
  const tabs = [
    { id: "wardrobe", label: "Wardrobe", icon: icons.wardrobe, color: PURPLE },
    { id: "lighting", label: "Lighting", icon: icons.light, color: GOLD },
    { id: "framing", label: "Framing", icon: icons.camera, color: MINT },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 6px", fontFamily: "'Playfair Display', serif" }}>Audition prep</h2>
      <p style={{ fontSize: 13, color: TEXT2, margin: "0 0 16px" }}>Technical direction for your self-tape</p>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {tabs.map(t => {
          const a = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 8px", borderRadius: 12, border: "none", cursor: "pointer",
              background: a ? `${t.color}15` : BG_CARD, transition: "all 0.15s",
            }}>
              <Ic d={t.icon} size={16} color={a ? t.color : TEXT3} />
              <span style={{ fontSize: 12, fontWeight: 600, color: a ? t.color : TEXT2 }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "wardrobe" && (
        <div>
          <div style={{ background: BG_CARD, borderRadius: 14, padding: "18px", border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: PURPLE, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Suggestion</p>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>{d.wardrobe.suggestion}</p>
          </div>
          <div style={{ background: CORAL_DIM, padding: "14px 18px", marginBottom: 12, borderLeft: `3px solid ${CORAL}` }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: CORAL, margin: "0 0 6px", textTransform: "uppercase" }}>Avoid</p>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.5 }}>{d.wardrobe.avoid}</p>
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: "0 0 8px", textTransform: "uppercase" }}>Color palette</p>
          <div style={{ display: "flex", gap: 8 }}>
            {d.wardrobe.colorPalette.map(c => (
              <div key={c} style={{ width: 40, height: 40, borderRadius: 10, background: c, border: `1px solid ${BORDER}` }} />
            ))}
          </div>
        </div>
      )}

      {tab === "lighting" && (
        <div>
          <div style={{ background: BG_CARD, borderRadius: 14, padding: "18px", border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GOLD, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Key light setup</p>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>{d.lighting.setup}</p>
          </div>
          <div style={{ background: BG_CARD, borderRadius: 14, padding: "18px", border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GOLD, margin: "0 0 8px", textTransform: "uppercase" }}>Background</p>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>{d.lighting.background}</p>
          </div>
          <div style={{ background: BG_CARD, borderRadius: 14, padding: "18px", border: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GOLD, margin: "0 0 8px", textTransform: "uppercase" }}>Eyeline</p>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>{d.lighting.eyeline}</p>
          </div>
        </div>
      )}

      {tab === "framing" && (
        <div>
          <div style={{ background: BG_CARD, borderRadius: 14, padding: "18px", border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: MINT, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Shot size</p>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>{d.framing.shot}</p>
          </div>
          <div style={{ background: BG_CARD, borderRadius: 14, padding: "18px", border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: MINT, margin: "0 0 8px", textTransform: "uppercase" }}>Physical direction</p>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>{d.framing.movement}</p>
          </div>
          <div style={{ background: GOLD_DIM, padding: "14px 18px", borderLeft: `3px solid ${GOLD}` }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GOLD, margin: "0 0 6px", textTransform: "uppercase" }}>Slate tip</p>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.5 }}>{d.slate}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCENE GENERATOR
   ═══════════════════════════════════════════════════ */
function GeneratorScreen() {
  const [genre, setGenre] = useState("drama");
  const [tone, setTone] = useState("intense");
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sceneText, setSceneText] = useState("");
  const [genError, setGenError] = useState("");

  const genres = ["Drama", "Comedy", "Thriller", "Sci-Fi", "Romance", "Horror"];
  const tones = ["Intense", "Tender", "Dark", "Playful", "Urgent", "Dry"];
  const difficulties = ["Cold read", "Intermediate", "Advanced"];

  const handleGenerate = async () => {
    setLoading(true);
    setGenError('');
    try {
      // 60s timeout — without it a slow/hung BE leaves the spinner stuck
      // forever with no feedback (the request would never reject).
      // Use the real screenplay generator (SceneGeneratorView, ~800 tokens), not
      // the line-feedback endpoint (capped at 1-2 sentences) — that was charging a
      // token for output it structurally cannot produce.
      const response = await axios.post(endPoints.generateScene, {
        genre: genre.toLowerCase(),
        tone: tone.toLowerCase(),
        character_type: 'actor',
        free_prompt: `Write a 1-page dramatic ${genre} scene with ${tone} tone. Format as screenplay with character names in CAPS. Make it emotionally rich. 2 characters, 6-8 lines each.`,
      }, { timeout: 60000 });
      const text = response.data?.data?.scene || response.data?.scene || response.data?.data?.feedback || response.data?.feedback || "";
      setSceneText(text);
      if (text) setGenerated(true);
      else setGenError("The generator didn't return a scene. Please try again.");
    } catch (err) {
      setGenError(
        err?.code === 'ECONNABORTED'
          ? "This is taking too long. Please try again."
          : "Couldn't generate a scene right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 6px", fontFamily: "'Playfair Display', serif" }}>Scene generator</h2>
      <p style={{ fontSize: 13, color: TEXT2, margin: "0 0 20px" }}>Generate a custom practice scene with AI</p>

      {!generated ? (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Genre</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {genres.map(g => (
              <button key={g} onClick={() => setGenre(g.toLowerCase())} style={{
                padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                background: genre === g.toLowerCase() ? CORAL_DIM : BG_CARD,
                color: genre === g.toLowerCase() ? CORAL : TEXT2,
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                border: genre === g.toLowerCase() ? `1px solid ${CORAL}30` : `1px solid ${BORDER}`,
              }}>{g}</button>
            ))}
          </div>

          <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Tone</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {tones.map(t => (
              <button key={t} onClick={() => setTone(t.toLowerCase())} style={{
                padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                background: tone === t.toLowerCase() ? GOLD_DIM : BG_CARD,
                color: tone === t.toLowerCase() ? GOLD : TEXT2,
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                border: tone === t.toLowerCase() ? `1px solid ${GOLD}30` : `1px solid ${BORDER}`,
              }}>{t}</button>
            ))}
          </div>

          <p style={{ fontSize: 11, fontWeight: 600, color: TEXT3, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.8px" }}>Difficulty</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {difficulties.map((d, i) => (
              <button key={d} style={{
                flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                background: i === 0 ? MINT_DIM : BG_CARD,
                border: i === 0 ? `1px solid ${MINT}30` : `1px solid ${BORDER}`,
                color: i === 0 ? MINT : TEXT2, fontSize: 12, fontWeight: 600, textAlign: "center",
              }}>{d}</button>
            ))}
          </div>

          <button onClick={handleGenerate} disabled={loading} style={{
            width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer",
            background: loading ? `${CORAL}80` : `linear-gradient(135deg, ${CORAL_SOFT}, ${CORAL})`, color: "#fff",
            fontSize: 15, fontWeight: 700, opacity: loading ? 0.7 : 1,
          }}>{loading ? "Generating..." : "Generate scene"}</button>
          {genError && (
            <p style={{ fontSize: 13, color: CORAL, marginTop: 10, textAlign: "center" }}>{genError}</p>
          )}
        </>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Badge text="Drama" color={CORAL} />
            <Badge text="Intense" color={GOLD} />
            <Badge text="Cold read" color={MINT} />
          </div>
          <div style={{ background: BG_CARD, borderRadius: 16, padding: "18px", border: `1px solid ${BORDER}`, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.55, fontFamily: '"JetBrains Mono", ui-monospace, monospace', whiteSpace: "pre-wrap" }}>{sceneText}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setGenerated(false)} style={{ flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${BORDER_ACTIVE}`, background: BG_ELEVATED, color: TEXT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Regenerate</button>
            <button style={{ flex: 2, padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${MINT}, ${GREEN})`, color: "var(--aurora-text)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Analyze this scene</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LIVE REHEARSAL (stub — connects to existing Live Scene Mode)
   ═══════════════════════════════════════════════════ */
function RehearseScreen() {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 6px", fontFamily: "'Playfair Display', serif" }}>Live rehearsal</h2>
      <p style={{ fontSize: 13, color: TEXT2, margin: "0 0 20px" }}>AI scene partner with informed intent from breakdown</p>

      <div style={{
        background: active ? "var(--aurora-glass-strong)" : BG_CARD, borderRadius: 22, padding: 28, marginBottom: 20,
        border: active ? `1px solid ${GOLD}30` : `1px solid ${BORDER}`,
        textAlign: "center", minHeight: 240, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", transition: "all 0.3s",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: active ? `${GOLD}15` : `${MINT}08`,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
          animation: active ? "micPulse 1.5s ease-in-out infinite" : "none",
        }}>
          <Ic d={icons.rehearse} size={32} color={active ? GOLD : TEXT3} />
        </div>
        {active ? (
          <>
            <p style={{ fontSize: 13, color: TEXT2, margin: "0 0 4px" }}>Playing as Detective Cruz</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: TEXT, margin: 0, fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>
              "You were at the warehouse..."
            </p>
            <div style={{ marginTop: 14, display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: CORAL, animation: "blink 1s infinite" }} />
              <span style={{ fontSize: 12, color: TEXT2 }}>Listening for your line...</span>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Ready to rehearse</p>
            <p style={{ fontSize: 12, color: TEXT2, margin: "4px 0 0" }}>Scene breakdown loaded. AI reads with informed intent</p>
          </>
        )}
      </div>

      {/* Context-aware direction */}
      <div style={{ background: GOLD_DIM, padding: "14px 18px", marginBottom: 16, borderLeft: `3px solid ${GOLD}` }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: GOLD, margin: "0 0 4px", textTransform: "uppercase" }}>Direction for this take</p>
        <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>Try playing the subtext. Maya is protecting someone, not defying authority. Let the loyalty drive the deflection.</p>
      </div>

      <button onClick={() => navigate("/dashboard/scene-study")} style={{
        width: "100%", padding: "16px", borderRadius: 16, border: "none",
        cursor: "pointer",
        background: `linear-gradient(135deg, ${GOLD}, var(--aurora-heritage-gold-deep))`,
        color: "var(--aurora-text)", fontSize: 16, fontWeight: 700,
      }}>
        Start rehearsal
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════ */
export default function CastingDirectorAI() {
  // Apple Guideline 5.1.1(i) — every CastingDirectorAI screen invokes
  // the LLM via apps/ai/views.py.
  useAIGate();
  const [mode, setMode] = useState(null);

  const screens = { breakdown: <BreakdownScreen />, rehearse: <RehearseScreen />, notes: <NotesScreen />, prep: <PrepScreen />, generate: <GeneratorScreen /> };

  return (
    <div style={{ background: BG_DEEP, minHeight: 0, fontFamily: "'Space Grotesk', sans-serif", color: TEXT }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes micPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 40px" }}>
        {/* Header */}
        {mode && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
            <button onClick={() => setMode(null)} style={{ width: 36, height: 36, borderRadius: 10, background: BG_ELEVATED, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Ic d={icons.back} size={18} color={TEXT2} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT2 }}>
              {MODES.find(m => m.id === mode)?.label}
            </span>
          </div>
        )}

        {mode === null ? <HubScreen setMode={setMode} /> : screens[mode]}
      </div>
    </div>
  );
}
