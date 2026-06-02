import { useState, useMemo } from 'react';

/**
 * V1HeroGraph — interactive metric ring.
 * 234×234 SVG with arc tween, head-of-arc dot, 12 trend dots, animated
 * center number, period selector (W/M/Q), metric tabs (CB/SUB/BK).
 *
 * Data shape:
 *   data = {
 *     W: { label: '12 WEEKS', labels: [...12], callback: [...12], submitted: [...12], booked: [...12] },
 *     M: { label: '12 MONTHS', ... },
 *     Q: { label: 'BY QUARTER', ... },
 *   }
 */
export default function V1HeroGraph({ data }) {
  const [metric, setMetric] = useState('callback');
  const [period, setPeriod] = useState('M');
  const [idx, setIdx] = useState(11);

  const dataset = data?.[period];
  const series = dataset?.[metric] || [];
  const labels = dataset?.labels || [];
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const val = series[idx] || 0;

  const metricMeta = {
    callback:  { tab: 'CB',  long: 'CALLBACK RATE', short: 'callback rate', color: 'var(--aurora-heritage-gold)', unit: '%', deltaUnit: 'pt' },
    submitted: { tab: 'SUB', long: 'SUBMISSIONS',   short: 'submissions',   color: 'var(--aurora-sky)',           unit: '',  deltaUnit: '' },
    booked:    { tab: 'BK',  long: 'BOOKED',        short: 'booked',        color: 'var(--aurora-mint)',          unit: '',  deltaUnit: '' },
  };
  const M = metricMeta[metric];

  const size = 234;
  const cx = size / 2;
  const cy = size / 2;
  const ringR = 86;
  const ringC = 2 * Math.PI * ringR;
  const pct = max ? val / max : 0;
  const dashOffset = ringC * (1 - pct);
  const dotR = ringR + 16;

  const prev = idx > 0 ? series[idx - 1] : val;
  const delta = val - prev;
  const deltaTxt = `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta)}${M.deltaUnit}`;

  const headAngle = pct * 2 * Math.PI - Math.PI / 2;
  const headX = cx + ringR * Math.cos(headAngle);
  const headY = cy + ringR * Math.sin(headAngle);

  // Pre-compute solid color from the CSS variable for SVG fills that
  // can't consume var() directly inside `stop-color` of a gradient.
  const solidGold = '#D4A85F';
  const solidSky = '#A7D6FF';
  const solidMint = '#9FE6B4';
  const solidPeach = '#FFC9A3';
  const metricSolid = metric === 'callback' ? solidGold : metric === 'submitted' ? solidSky : solidMint;

  return (
    <div
      className="aurora-card"
      style={{ padding: '16px 18px 14px', position: 'relative', overflow: 'hidden' }}
    >
      <style>{`
        .v1hg-ring-arc { transition: stroke 0.4s cubic-bezier(.5,.1,.2,1), stroke-dashoffset 0.65s cubic-bezier(.5,.1,.2,1); }
        .v1hg-ring-head { transition: cx 0.65s cubic-bezier(.5,.1,.2,1), cy 0.65s cubic-bezier(.5,.1,.2,1), fill 0.4s; }
        .v1hg-ring-dot { transition: r 0.3s cubic-bezier(.5,.1,.2,1), opacity 0.3s, fill 0.4s; }
        .v1hg-ring-dot-active { animation: v1hg-ring-pulse 2.2s ease-in-out infinite; }
        @keyframes v1hg-ring-pulse {
          0%,100% { filter: drop-shadow(0 0 4px currentColor); }
          50%     { filter: drop-shadow(0 0 14px currentColor); }
        }
        @keyframes v1hg-num-in {
          from { opacity: 0; transform: translateY(8px) scale(0.94); letter-spacing: -1.4px; }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* eyebrow + delta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span className="aurora-eyebrow" style={{ color: 'var(--aurora-dim)' }}>{M.long}</span>
        <span
          key={`${metric}-${period}-${idx}-d`}
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 100,
            background: delta >= 0 ? solidMint : solidPeach,
            color: '#0E0D0A',
            letterSpacing: '0.05em',
            fontWeight: 600,
            animation: 'v1hg-num-in 0.42s cubic-bezier(.2,.7,.3,1)',
          }}
        >
          {deltaTxt}
        </span>
      </div>

      {/* metric tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 4 }}>
        {Object.entries(metricMeta).map(([k, m]) => {
          const on = metric === k;
          const onSolid = k === 'callback' ? solidGold : k === 'submitted' ? solidSky : solidMint;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setMetric(k)}
              style={{
                padding: 8,
                borderRadius: 100,
                background: on ? onSolid : 'rgba(255,255,255,0.55)',
                border: `1px solid ${on ? onSolid : 'rgba(255,255,255,0.55)'}`,
                color: '#0E0D0A',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.15em',
                fontWeight: on ? 700 : 500,
                cursor: 'pointer',
                boxShadow: on ? `0 6px 18px ${onSolid}66` : 'none',
                transition: 'background 0.25s, box-shadow 0.25s, border-color 0.25s',
              }}
            >
              {m.tab}
            </button>
          );
        })}
      </div>

      {/* ring */}
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <radialGradient id="v1hg-ringbg" cx="50%" cy="50%" r="50%">
              <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor={metricSolid} stopOpacity="0.22" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={ringR + 6} fill="url(#v1hg-ringbg)" />
          {/* background ring */}
          <circle cx={cx} cy={cy} r={ringR} stroke="rgba(10,10,10,0.07)" strokeWidth="12" fill="none" />
          {/* foreground arc */}
          <circle
            className="v1hg-ring-arc"
            cx={cx}
            cy={cy}
            r={ringR}
            stroke={metricSolid}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={ringC}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          {/* head-of-arc indicator */}
          <circle
            className="v1hg-ring-head"
            cx={headX}
            cy={headY}
            r="7"
            fill={metricSolid}
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />
          {/* trend dots */}
          {series.map((v, i) => {
            const angle = (i / series.length) * 2 * Math.PI - Math.PI / 2 + (Math.PI / series.length);
            const x = cx + dotR * Math.cos(angle);
            const y = cy + dotR * Math.sin(angle);
            const intensity = (max - min) ? (v - min) / (max - min) : 0.7;
            const r = i === idx ? 5.5 : 2.4 + intensity * 2.0;
            const op = 0.32 + intensity * 0.68;
            const active = i === idx;
            return (
              <g key={i}>
                <circle
                  className={`v1hg-ring-dot ${active ? 'v1hg-ring-dot-active' : ''}`}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={metricSolid}
                  style={{ color: metricSolid, opacity: op }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={14}
                  fill="transparent"
                  onClick={() => setIdx(i)}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            );
          })}
        </svg>

        {/* center value */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: '100%',
            pointerEvents: 'none',
          }}
        >
          <div
            key={`${metric}-${period}-${idx}-l`}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: 'var(--aurora-dim)',
              letterSpacing: '0.18em',
              animation: 'v1hg-num-in 0.42s cubic-bezier(.2,.7,.3,1)',
            }}
          >
            {labels[idx]}
          </div>
          <div
            key={`${metric}-${period}-${idx}-v`}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 58,
              fontWeight: 500,
              letterSpacing: '-2.4px',
              lineHeight: 1,
              marginTop: 4,
              color: 'var(--aurora-text)',
              animation: 'v1hg-num-in 0.42s cubic-bezier(.2,.7,.3,1)',
            }}
          >
            {val}
            <span style={{ fontSize: 22, color: 'var(--aurora-sub)' }}>{M.unit}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--aurora-sub)', marginTop: 6 }}>{M.short}</div>
        </div>
      </div>

      {/* period segmented */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, marginBottom: 8 }}>
        <div
          style={{
            display: 'inline-flex',
            gap: 2,
            padding: 3,
            background: 'rgba(10,10,10,0.05)',
            borderRadius: 100,
          }}
        >
          {Object.entries(data || {}).map(([k, d]) => {
            const on = period === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => { setPeriod(k); setIdx(11); }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 100,
                  background: on ? '#FFFFFF' : 'transparent',
                  boxShadow: on ? '0 2px 6px rgba(10,10,10,0.08), 0 0 0 1px rgba(10,10,10,0.04)' : 'none',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9,
                  letterSpacing: '0.15em',
                  fontWeight: on ? 700 : 500,
                  color: on ? 'var(--aurora-text)' : 'var(--aurora-dim)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, box-shadow 0.2s, color 0.2s',
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* hint */}
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          color: 'var(--aurora-dim)',
          textAlign: 'center',
          letterSpacing: '0.18em',
        }}
      >
        TAP A DOT TO SCRUB · TAP CB / SUB / BK TO SWITCH
      </div>
    </div>
  );
}
