import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Clock, MessageCircle, Star, MapPin } from 'lucide-react';
import GenreTags from './components/GenreTags';
import UnionBadge from './components/UnionBadge';
import AvailabilityStatus from './components/AvailabilityStatus';
import ProfilePhoto from '../../../components/Shared/ProfilePhoto';
import { swipeOnReader, fetchFavorites } from '../../../redux/features/readers/readersMatchSlice';
import { showSnackbar } from '../../../redux/features/snackbarSlice/snackbarSlice';

// Look up a reader by id across every place we might already have them
// cached locally. Route into this page can come from the swipe stack,
// the Green Room matches list, or the Favorites tab, and any of those
// already has the actor's public data in redux.
function useReader(readerId) {
  const readers = useSelector((s) => s.readersMatch.readers || []);
  const matches = useSelector((s) => s.readersMatch.matches || []);
  const favorites = useSelector((s) => s.readersMatch.favorites || []);

  return useMemo(() => {
    const idStr = String(readerId);
    const fromReaders = readers.find((r) => String(r.id) === idStr);
    if (fromReaders) return { ...fromReaders, source: 'discover' };

    const fromMatch = matches.find((m) => String(m?.other_actor?.id) === idStr);
    if (fromMatch) {
      // Match shape has the actor under `other_actor` plus match metadata.
      return { ...(fromMatch.other_actor || {}), matchId: fromMatch.id, source: 'match' };
    }

    const fromFav = favorites.find((f) => String(f?.id ?? f?.other_actor?.id) === idStr);
    if (fromFav) return { ...(fromFav.other_actor || fromFav), source: 'favorite' };

    return null;
  }, [readerId, readers, matches, favorites]);
}

const ReaderProfile = () => {
  const { readerId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const reader = useReader(readerId);

  // If they came in via a Green Room match we already have a matchId;
  // otherwise the "Chat" button takes them through the swipe flow.
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

  const headshot = reader?.headshot || reader?.user_image;

  const handleChat = () => {
    if (matchId) {
      navigate(`/dashboard/green-room/${matchId}`);
    } else {
      // No match yet — bounce them to the swipe flow filtered to this user
      // would be ideal, but for v1 we just send them to Find a Reader so
      // they can find/swipe on this person.
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
      // No "unstar" endpoint — leave a clear message rather than fail silently.
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
    return (
      <div className="min-h-[calc(100vh-80px)] bg-transparent px-4 py-8">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-1.5 text-sm text-[rgba(10,10,10,0.4)] transition-colors hover:text-[#0A0A0A]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="rounded-xl border border-[rgba(10,10,10,0.08)] bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[rgba(10,10,10,0.62)]">
              We couldn't find this profile in your recent activity. Try opening it from Find a Reader, Green Room, or Favorites.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-transparent px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-[rgba(10,10,10,0.4)] transition-colors hover:text-[#0A0A0A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Headshot */}
        <div className="mb-6 flex h-64 w-full items-center justify-center overflow-hidden rounded-xl bg-gray-200">
          {headshot ? (
            <ProfilePhoto src={headshot} alt={reader.name} initials={initials} className="h-64 w-full" />
          ) : (
            <span className="text-7xl font-bold text-[rgba(10,10,10,0.4)]">{initials}</span>
          )}
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-[rgba(10,10,10,0.08)] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0f0f1a]">
                {reader.name || 'Actor'}
              </h1>
              {reader.experience_level && (
                <p className="mt-0.5 text-sm text-[rgba(10,10,10,0.62)]">
                  {reader.experience_level}
                </p>
              )}
              {reader.based_in && (
                <p className="mt-1 flex items-center gap-1 text-xs text-[rgba(10,10,10,0.5)]">
                  <MapPin size={11} />
                  {reader.based_in}
                </p>
              )}
            </div>
            <AvailabilityStatus online={reader.is_online} />
          </div>

          {/* Union */}
          {reader.union && (
            <div className="mt-4">
              <UnionBadge union={reader.union} />
            </div>
          )}

          {/* Bio */}
          {reader.bio && (
            <div className="mt-5">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[rgba(10,10,10,0.4)]">
                Bio
              </h3>
              <p className="text-sm leading-relaxed text-[rgba(10,10,10,0.62)]">
                {reader.bio}
              </p>
            </div>
          )}

          {/* Genres */}
          {reader.genres?.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[rgba(10,10,10,0.4)]">
                Genres
              </h3>
              <GenreTags genres={reader.genres} />
            </div>
          )}

          {/* Recent activity */}
          {reader.recent_activity && (
            <div className="mt-5 flex items-center gap-1.5 text-xs text-[rgba(10,10,10,0.4)]">
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D4A85F] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#C09850]"
          >
            <MessageCircle size={16} />
            {matchId ? 'Open Chat' : 'Match to Chat'}
          </button>

          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={isFavorited}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              isFavorited
                ? 'border-[#D4A85F]/40 bg-[#D4A85F]/10 text-[#7A5A18]'
                : 'border-[rgba(10,10,10,0.14)] bg-white text-[#0A0A0A] hover:bg-[#F4F4EE]'
            }`}
          >
            <Star size={16} fill={isFavorited ? '#D4A85F' : 'none'} />
            {isFavorited ? 'Favorited' : 'Add to Favorites'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReaderProfile;
