import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, Star } from 'lucide-react';
import ActorProfileCard from './components/ActorProfileCard';
import { fetchFavorites, swipeOnReader } from '../../../redux/features/readers/readersMatchSlice';

const Favorites = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { favorites = [], favoritesLoading } = useSelector((state) => state.readersMatch);

  useEffect(() => {
    dispatch(fetchFavorites());
  }, [dispatch]);

  const handleSlate = async (actor) => {
    try {
      const result = await dispatch(
        swipeOnReader({ reader_id: actor.id, action: 'right' })
      ).unwrap();
      if (result?.matched) navigate(`/dashboard/its-a-scene/${result.match_id}`);
      else dispatch(fetchFavorites());
    } catch { /* handled */ }
  };

  const handlePass = async (actor) => {
    try {
      await dispatch(swipeOnReader({ reader_id: actor.id, action: 'left' })).unwrap();
      dispatch(fetchFavorites());
    } catch { /* handled */ }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-transparent px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Star size={18} className="text-[#FCE072] fill-[#FCE072]" />
          <h1 className="text-xl font-bold text-[#0A0A0A]">Favorites</h1>
        </div>
        <p className="text-xs text-[#666] mb-6">Actors you've saved for future readings. Slate them when you're ready to go.</p>

        {favoritesLoading && (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF8280]" />
          </div>
        )}

        {!favoritesLoading && favorites.length === 0 && (
          <div className="flex h-60 flex-col items-center justify-center text-center">
            <Star className="mb-3 h-10 w-10 text-[#444]" />
            <p className="text-sm font-semibold text-[#0A0A0A]">No favorites yet</p>
            <p className="mt-1 text-xs text-[#666]">
              Star an actor on Find a Reader to save them here.
            </p>
          </div>
        )}

        {!favoritesLoading && favorites.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {favorites.map((actor) => (
              <ActorProfileCard
                key={actor.id}
                actor={actor}
                onSlate={() => handleSlate(actor)}
                onStar={() => {}} // already starred
                onPass={() => handlePass(actor)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
