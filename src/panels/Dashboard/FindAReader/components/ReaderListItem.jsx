import { MapPin, ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfilePhoto from '../../../../components/Shared/ProfilePhoto';
import { openReaderProfile } from '../../../../utils/openReaderProfile';

const MAX_GENRES = 3;

const ReaderListItem = ({ match, onClick }) => {
  const navigate = useNavigate();
  const other = match?.other_actor || {};
  const openProfile = (e) => {
    e.stopPropagation();
    openReaderProfile(other?.id, navigate);
  };

  const initials = (other.name || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const unionLabel = {
    'sag-aftra': 'SAG-AFTRA',
    'aea': 'AEA',
    'non-union': 'Non-Union',
    'fi-core': 'Fi-Core',
  }[other?.union] || other?.union;

  const genres = Array.isArray(other?.genres) ? other.genres : [];
  const shownGenres = genres.slice(0, MAX_GENRES);
  const extraGenres = genres.length - shownGenres.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4A85F]/40"
      style={{
        background: 'var(--aurora-surface-solid)',
        border: '1px solid var(--aurora-line)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar — separate tap target → ReaderProfile */}
        <span
          role="link"
          tabIndex={0}
          onClick={openProfile}
          onKeyDown={(e) => { if (e.key === 'Enter') openProfile(e); }}
          aria-label={`View ${other?.name || 'actor'}'s profile`}
          className="relative shrink-0 rounded-full cursor-pointer focus:outline-none transition-transform active:scale-95"
          style={{
            // subtle persistent gold ring tells users the avatar is its
            // own tap target distinct from the chat-opening row click
            boxShadow: 'inset 0 0 0 2px rgba(212,168,95,0.40)',
            padding: 2,
            borderRadius: '9999px',
          }}
        >
          <ProfilePhoto
            src={other?.headshot || other?.user_image}
            avatarStyle={other?.avatar_style}
            seedId={other?.id}
            alt={other?.name}
            initials={initials}
            className="h-14 w-14"
          />
          {/* Online dot — only when the partner is actually online (was always green) */}
          {other?.is_online && (
            <span
              className="absolute bottom-0 right-0 h-3 w-3 rounded-full"
              style={{
                background: '#22C55E',
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: 'var(--aurora-surface-solid)',
              }}
            />
          )}
          {/* Tiny profile-link badge — top-right, persistent affordance */}
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full"
            style={{
              width: 16,
              height: 16,
              background: 'var(--aurora-heritage-gold)',
              border: '1.5px solid var(--aurora-surface-solid)',
              boxShadow: '0 1px 4px rgba(10,10,10,0.18)',
            }}
            aria-hidden="true"
          >
            <User size={9} color="#FFF" strokeWidth={2.5} />
          </span>
        </span>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="truncate text-[15px] font-semibold"
              style={{ color: 'var(--aurora-text)' }}
            >
              {other?.name || 'Actor'}
            </span>
            {unionLabel && (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase"
                style={{
                  background: 'rgba(212,168,95,0.15)',
                  color: '#7A5A18',
                  letterSpacing: '0.05em',
                }}
              >
                {unionLabel}
              </span>
            )}
          </div>

          {/* Location · experience · rating — single muted line, no wrap */}
          <div
            className="flex items-center gap-2 text-[11px] truncate"
            style={{ color: 'var(--aurora-sub)' }}
          >
            {other?.based_in && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {other.based_in}
              </span>
            )}
            {other?.based_in && (other?.years_experience || other?.rating > 0) && (
              <span aria-hidden style={{ color: 'var(--aurora-line)' }}>·</span>
            )}
            {other?.years_experience > 0 && (
              <span>{other.years_experience}y exp</span>
            )}
            {other?.years_experience > 0 && other?.rating > 0 && (
              <span aria-hidden style={{ color: 'var(--aurora-line)' }}>·</span>
            )}
            {other?.rating > 0 && (
              <span style={{ color: '#C09850' }}>
                ★ {other.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Genres — capped, soft pills */}
          {shownGenres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {shownGenres.map((g) => (
                <span
                  key={g}
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{
                    background: 'color-mix(in oklch, var(--aurora-line) 80%, transparent)',
                    color: 'var(--aurora-sub)',
                  }}
                >
                  {g}
                </span>
              ))}
              {extraGenres > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{ color: 'var(--aurora-dim)' }}
                >
                  +{extraGenres}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Chevron — affordance that the whole card is tappable */}
        <ChevronRight
          size={18}
          className="shrink-0"
          style={{ color: 'var(--aurora-dim)' }}
        />
      </div>
    </button>
  );
};

export default ReaderListItem;
