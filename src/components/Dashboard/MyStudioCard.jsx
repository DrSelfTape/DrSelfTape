/**
 * Home-screen card for people who actually use the studio.
 *
 * ~1,880 accounts have studio bookings and LA's regulars book about nine times
 * a year each — they are the app's most engaged real-world users and had no
 * reason to open it. My Studio lives two taps deep in the More menu; this
 * surfaces the same thing where they'll see it.
 *
 * RENDERS NOTHING for anyone without sessions. It's driven by
 * /bookings/studio-summary/, a flat handful of fields — Home loads on every
 * launch for every user, and one account has 822 bookings, so this must never
 * pull the booking list to decide whether to show a card.
 */
import { useEffect, useState } from 'react';
import axios from '../../redux/http';
import endPoints, { baseURL } from '../../redux/constant';
import { openExternal } from '../../utils/openExternal';

// The tape page is served by the API host, not the app host.
const apiOrigin = String(baseURL || '').replace(/\/api\/?$/, '');

const fmtWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
};

export default function MyStudioCard({ setCurrentPanel }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(endPoints.studioSummary);
        if (alive) setSummary(res?.data?.data || res?.data || null);
      } catch {
        // Home must never break because one card's request failed. No card.
        if (alive) setSummary(null);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!summary?.has_sessions) return null;

  const { upcoming, past_count: pastCount, latest_delivery_path: latestPath } = summary;

  return (
    <div className="aurora-card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <span
            className="aurora-eyebrow"
            style={{ display: 'block', color: 'var(--aurora-dim)', marginBottom: 4 }}
          >
            MY STUDIO
          </span>
          {upcoming ? (
            <>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--aurora-text)', margin: 0 }}>
                {upcoming.service_name}
              </p>
              <p style={{ fontSize: 12, color: 'var(--aurora-sub)', margin: '2px 0 0' }}>
                {fmtWhen(upcoming.occurs_at)}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--aurora-text)', margin: 0 }}>
                {pastCount} {pastCount === 1 ? 'session' : 'sessions'} at the studio
              </p>
              <p style={{ fontSize: 12, color: 'var(--aurora-sub)', margin: '2px 0 0' }}>
                Your tapes and casting notes
              </p>
            </>
          )}
        </div>
        <span style={{ fontSize: 26, flexShrink: 0 }}>🎬</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={() => setCurrentPanel?.('my-studio')}
          className="aurora-mono"
          style={{
            flex: 1, padding: '11px 12px', borderRadius: 100, cursor: 'pointer',
            border: '1px solid color-mix(in oklch, var(--aurora-heritage-gold-deep) 40%, transparent)',
            background: 'transparent', color: 'var(--aurora-text)',
            fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}
        >
          My sessions
        </button>
        {latestPath && (
          <button
            onClick={() => openExternal(`${apiOrigin}${latestPath}`)}
            className="aurora-mono"
            style={{
              flex: 1, padding: '11px 12px', borderRadius: 100, cursor: 'pointer', border: 'none',
              background: 'var(--aurora-heritage-gold-deep)', color: '#0A0A0A',
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
            }}
          >
            Latest tape
          </button>
        )}
      </div>
    </div>
  );
}
