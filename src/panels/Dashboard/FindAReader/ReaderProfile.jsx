import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Clock, MessageCircle, Star, MapPin, Flag, ShieldOff } from 'lucide-react';
import GenreTags from './components/GenreTags';
import UnionBadge from './components/UnionBadge';
import AvailabilityStatus from './components/AvailabilityStatus';
import ProfilePhoto from '../../../components/Shared/ProfilePhoto';
import { hasAvatar } from '../../../components/Aurora/avatarStyle';
import { swipeOnReader, fetchFavorites, fetchReaderById } from '../../../redux/features/readers/readersMatchSlice';
import { showSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';
import ReportBlockMenu from '../../../components/Shared/ReportBlockMenu';

function useReader(readerId) {
  const readers = useSelector((s) => s.readersMatch.readers || []);
  const matches = useSelector((s) => s.readersMatch.matches || []);
  const favorites = useSelector((s) => s.readersMatch.favorites || []);
  const fetched = useSelector((s) => s.readersMatch.readerById?.[String(readerId)]?.data);

  return useMemo(() => {
    const idStr = String(readerId);
    const fromReaders = readers.find((r) => String(r.id) === idStr);
    if (fromReaders) return { ...fromReaders, source: 'discover' };

    const fromMatch = matches.find((m) => String(m?.other_actor?.id) === idStr);
    if (fromMatch) {
      return { ...(fromMatch.other_actor || {}), matchId: fromMatch.id, source: 'match' };
    }

    const fromFav = favorites.find((f) => String(f?.id ?? f?.other_actor?.id) === idStr);
    if (fromFav) return { ...(fromFav.other_actor || fromFav), source: 'favorite' };

    if (fetched) return { ...fetched, source: 'fetch' };

    return null;
  }, [readerId, readers, matches, favorites, fetched]);
}

const goldGradient = {
  background: 'linear-gradient(135deg, var(--aurora-heritage-gold-light) 0%, var(--aurora-heritage-gold) 55%, var(--aurora-heritage-gold-deep) 100%)',
  color: '#FFF',
  boxShadow: '0 8px 22px rgba(212,168,95,0.30)',
};

const ReaderProfile = (props) => {
  // On web this mounts as a route and reads readerId from the URL params.
  // On the Capacitor shell it mounts bare as a mobile sub-panel, so accept an
  // injected readerId prop (and an onBack handler) that take precedence.
  const { readerId: paramId } = useParams();
  const readerId = props.readerId ?? paramId;
  const navigate = useNavigate();
  // navigate(-1) no-ops inside the Capacitor shell, so when mounted as a
  // mobile sub-panel use the injected onBack to dismiss back to Green Room.
  const handleBack = () => {
    if (props.onBack) props.onBack();
    else navigate(-1);
  };
  const dispatch = useDispatch();
  const reader = useReader(readerId);
  const fetchState = useSelector(
    (s) => s.readersMatch.readerById?.[String(readerId)] || {},
  );

  useEffect(() => {
    if (!readerId) return;
    if (reader) return;
    if (fetchState.loading || fetchState.data || fetchState.error) return;
    dispatch(fetchReaderById(readerId));
  }, [dispatch, readerId, reader, fetchState.loading, fetchState.data, fetchState.error]);

  const matchId = reader?.matchId;
  const favorites = useSelector((s) => s.readersMatch.favorites || []);
  const isFavorited = favorites.some(
    (f) => String(f?.id ?? f?.other_actor?.id) === String(readerId),
  );

  const initials = (reader?.name || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // A chosen avatar counts as having a picture — otherwise this page falls
  // through to the bare-initials block for anyone who picked one, while their
  // swipe card shows the avatar.
  const headshot = reader?.headshot || reader?.user_image;
  const hasPicture = headshot || hasAvatar(reader?.avatar_style);

  const handleChat = () => {
    if (matchId) {
      navigate(`/dashboard/green-room/${matchId}`);
    } else {
      dispatch(showSnackbar({
        message: 'You need to match with this reader before you can chat.',
        variant: 'info',
      }));
      navigate('/dashboard/find-a-reader');
    }
  };

  const handleToggleFavorite = async () => {
    if (!reader?.id) return;
    if (isFavorited) {
      dispatch(showSnackbar({
        message: 'Already in your favorites.',
        variant: 'info',
      }));
      return;
    }
    try {
      await dispatch(swipeOnReader({ reader_id: reader.id, action: 'star' })).unwrap();
      dispatch(showSnackbar({ message: `${reader.name || 'Reader'} added to favorites.`, variant: 'success' }));
      dispatch(fetchFavorites());
    } catch {
      dispatch(showSnackbar({ message: 'Could not add to favorites.', variant: 'error' }));
    }
  };

  if (!reader) {
    const isLoading = fetchState.loading || (!fetchState.error && !fetchState.data);
    return (
      <div className="min-h-[calc(100vh-80px)] px-4 py-8 aurora-page-in">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={handleBack}
            className="mb-6 flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--aurora-sub)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="aurora-card p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--aurora-sub)' }}>
              {isLoading
                ? 'Loading profile…'
                : "We couldn't find this profile. It may have been removed."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] px-4 py-8 aurora-page-in">
      <div className="mx-auto max-w-lg">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: 'var(--aurora-sub)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Headshot — full-bleed with subtle gold rim */}
        <div
          className="mb-6 relative h-72 w-full overflow-hidden"
          style={{
            borderRadius: 20,
            background: 'linear-gradient(160deg, #1A1308 0%, #2E2415 45%, #0F0E0A 100%)',
            boxShadow: '0 12px 30px rgba(10,10,10,0.18)',
          }}
        >
          {hasPicture ? (
            <ProfilePhoto
              src={headshot}
              avatarStyle={reader?.avatar_style}
              seedId={reader?.id}
              alt={reader.name}
              initials={initials}
              className="h-72 w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span style={{ fontSize: 80, fontWeight: 800, color: 'rgba(212,168,95,0.35)' }}>{initials}</span>
            </div>
          )}
          {/* gold-tint scrim */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(10,10,10,0.45) 100%)' }}
          />
        </div>

        {/* Info card */}
        <div className="aurora-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="aurora-eyebrow block" style={{ color: 'var(--aurora-dim)', marginBottom: 4 }}>READER</span>
              <h1 className="aurora-display text-2xl" style={{ color: 'var(--aurora-text)', letterSpacing: '-0.4px' }}>
                {reader.name || 'Actor'}
              </h1>
              {reader.experience_level && (
                <p className="mt-0.5 text-sm" style={{ color: 'var(--aurora-sub)' }}>
                  {reader.experience_level}
                </p>
              )}
              {reader.based_in && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--aurora-dim)' }}>
                  <MapPin size={11} />
                  {reader.based_in}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AvailabilityStatus online={reader.is_online} />
              <ReportBlockMenu
                targetType="user"
                targetUserId={reader.id}
                targetName={reader.name?.split(' ')[0] || 'this reader'}
              />
            </div>
          </div>

          {reader.union && (
            <div className="mt-4">
              <UnionBadge union={reader.union} />
            </div>
          )}

          {reader.bio && (
            <div className="mt-5">
              <h3 className="aurora-eyebrow mb-2" style={{ color: 'var(--aurora-dim)' }}>Bio</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--aurora-sub)' }}>
                {reader.bio}
              </p>
            </div>
          )}

          {reader.genres?.length > 0 && (
            <div className="mt-5">
              <h3 className="aurora-eyebrow mb-2" style={{ color: 'var(--aurora-dim)' }}>Genres</h3>
              <GenreTags genres={reader.genres} />
            </div>
          )}

          {reader.recent_activity && (
            <div className="mt-5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--aurora-dim)' }}>
              <Clock className="h-3.5 w-3.5" />
              {reader.recent_activity}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleChat}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all"
            style={goldGradient}
          >
            <MessageCircle size={16} />
            {matchId ? 'Open Chat' : 'Match to Chat'}
          </button>

          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={isFavorited}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all"
            style={isFavorited
              ? { background: 'rgba(212,168,95,0.12)', border: '1px solid rgba(212,168,95,0.45)', color: 'var(--aurora-heritage-gold-deep)' }
              : { background: 'var(--aurora-surface-solid)', border: '1px solid var(--aurora-line)', color: 'var(--aurora-text)' }
            }
          >
            <Star size={16} fill={isFavorited ? 'var(--aurora-heritage-gold)' : 'none'} color={isFavorited ? 'var(--aurora-heritage-gold)' : 'currentColor'} />
            {isFavorited ? 'Favorited' : 'Add to Favorites'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReaderProfile;
