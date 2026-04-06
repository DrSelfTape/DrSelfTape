import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import {
  updateReaderFilters,
  fetchAvailableReaders,
  setFiltersLocal,
} from '../../../redux/features/readers/readersMatchSlice';

const GENRES = [
  'Drama',
  'Comedy',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Action',
  'Period',
  'Indie',
  'Musical',
];

const EXPERIENCE_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Professional',
];

const UNION_OPTIONS = ['SAG-AFTRA', 'Non-Union', 'Both'];
const AVAILABILITY_OPTIONS = ['Online Now', 'Any'];
const GENDER_OPTIONS = ['Male', 'Female', 'Non-Binary', 'Any'];

const ReaderFilters = ({ onClose }) => {
  const dispatch = useDispatch();
  const savedFilters = useSelector((state) => state.readersMatch.filters);

  const [genres, setGenres] = useState(savedFilters.genres || []);
  const [experienceLevel, setExperienceLevel] = useState(
    savedFilters.experience_level || ''
  );
  const [unionStatus, setUnionStatus] = useState(
    savedFilters.union_status || 'Both'
  );
  const [availability, setAvailability] = useState(
    savedFilters.availability || 'Any'
  );
  const [gender, setGender] = useState(savedFilters.gender || 'Any');

  const toggleGenre = (genre) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleApply = async () => {
    const filters = {
      genres,
      experience_level: experienceLevel,
      union_status: unionStatus,
      availability,
      gender,
    };

    dispatch(setFiltersLocal(filters));
    localStorage.setItem('drst-reader-filters', JSON.stringify(filters));

    try {
      await dispatch(updateReaderFilters(filters)).unwrap();
    } catch {
      // still apply locally
    }

    dispatch(fetchAvailableReaders(filters));
    onClose();
  };

  const handleReset = () => {
    setGenres([]);
    setExperienceLevel('');
    setUnionStatus('Both');
    setAvailability('Any');
    setGender('Any');
    localStorage.removeItem('drst-reader-filters');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-[#1E1E1E] p-6 sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0f0f1a]">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#666666] transition-colors hover:bg-[#2A2A2A] hover:text-[#999999]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto">
          {/* Genre */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#0f0f1a]">
              Genre
            </h3>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const selected = genres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-[#A7ECDA] text-[#0f0f1a]'
                        : 'bg-[#2A2A2A] text-[#999999] hover:bg-gray-200'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#0f0f1a]">
              Experience Level
            </h3>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full rounded-lg border border-[#3A3A3A] px-3 py-2 text-sm text-[#0f0f1a] outline-none focus:border-[#C855F0]"
            >
              <option value="">Any</option>
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Union Status */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#0f0f1a]">
              Union Status
            </h3>
            <div className="flex gap-2">
              {UNION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setUnionStatus(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    unionStatus === option
                      ? 'bg-[#0f0f1a] text-white'
                      : 'bg-[#2A2A2A] text-[#999999] hover:bg-gray-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#0f0f1a]">
              Availability
            </h3>
            <div className="flex gap-2">
              {AVAILABILITY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAvailability(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    availability === option
                      ? 'bg-[#0f0f1a] text-white'
                      : 'bg-[#2A2A2A] text-[#999999] hover:bg-gray-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#0f0f1a]">
              Gender
            </h3>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGender(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    gender === option
                      ? 'bg-[#0f0f1a] text-white'
                      : 'bg-[#2A2A2A] text-[#999999] hover:bg-gray-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-lg border border-[#3A3A3A] px-4 py-2.5 text-sm font-medium text-[#999999] transition-colors hover:bg-[#1E1E1E]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 rounded-lg bg-[#C855F0] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ff6e6c]"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReaderFilters;
