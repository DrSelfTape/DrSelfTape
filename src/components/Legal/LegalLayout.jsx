import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

// Shared shell for legal pages — clean reading view that works
// logged-in or logged-out. Mirrors the auth pages' Aurora palette.
export function LegalLayout({ title, lastUpdated, children }) {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', color: '#0A0A0A', fontFamily: "-apple-system, BlinkMacSystemFont, 'Space Grotesk', 'Poppins', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700&display=swap" rel="stylesheet" />

      {/* Sticky header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,250,247,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(10,10,10,0.06)',
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px',
      }}>
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/login'))}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: 'none', background: 'transparent',
            color: 'rgba(10,10,10,0.62)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', padding: '6px 10px', borderRadius: 8,
          }}
        >
          <ChevronLeft size={16} /> Back
        </button>
      </header>

      <main style={{
        maxWidth: 720, margin: '0 auto',
        padding: '28px 20px calc(env(safe-area-inset-bottom, 0px) + 60px)',
      }}>
        <p style={{
          textTransform: 'uppercase', letterSpacing: '0.18em',
          fontSize: 11, fontWeight: 700, color: '#7A5A18', marginBottom: 8,
        }}>
          Legal
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 32, fontWeight: 700, letterSpacing: '-0.6px',
          color: '#0A0A0A', margin: 0,
        }}>
          {title}
        </h1>
        {lastUpdated && (
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', marginTop: 8 }}>
            Last updated: {lastUpdated}
          </p>
        )}

        <div style={{
          marginTop: 24, fontSize: 15, lineHeight: 1.65,
          color: 'rgba(10,10,10,0.78)',
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}

// Section + paragraph helpers so the legal pages stay readable.
export function Section({ heading, children }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 20, fontWeight: 600, color: '#0A0A0A',
        margin: '0 0 10px',
      }}>
        {heading}
      </h2>
      {children}
    </section>
  );
}
