import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, Clock } from 'lucide-react';
import GenreTags from './components/GenreTags';
import UnionBadge from './components/UnionBadge';
import AvailabilityStatus from './components/AvailabilityStatus';

const ReaderProfile = () => {
  const { readerId } = useParams();
  const navigate = useNavigate();

  const { readers } = useSelector((state) => state.readersMatch);

  const reader = readers.find(
    (r) => String(r.id) === String(readerId)
  );

  const initials = (reader?.name || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
        <div className="mb-6 flex h-64 w-full items-center justify-center rounded-xl bg-gray-200">
          <span className="text-7xl font-bold text-[rgba(10,10,10,0.4)]">{initials}</span>
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-[rgba(10,10,10,0.08)] bg-[#1E1E1E] p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0f0f1a]">
                {reader?.name || 'Actor'}
              </h1>
              {reader?.experience_level && (
                <p className="mt-0.5 text-sm text-[rgba(10,10,10,0.62)]">
                  {reader.experience_level}
                </p>
              )}
            </div>
            <AvailabilityStatus online={reader?.is_online} />
          </div>

          {/* Union */}
          {reader?.union && (
            <div className="mt-4">
              <UnionBadge union={reader.union} />
            </div>
          )}

          {/* Bio */}
          {reader?.bio && (
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
          {reader?.genres?.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[rgba(10,10,10,0.4)]">
                Genres
              </h3>
              <GenreTags genres={reader.genres} />
            </div>
          )}

          {/* Recent activity */}
          {reader?.recent_activity && (
            <div className="mt-5 flex items-center gap-1.5 text-xs text-[rgba(10,10,10,0.4)]">
              <Clock className="h-3.5 w-3.5" />
              {reader.recent_activity}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReaderProfile;
