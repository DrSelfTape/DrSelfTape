import { useState } from 'react';
import { createPortal } from 'react-dom';
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

const ACCENT_OPTIONS = [
  'American (Standard)',
  'American (Southern)',
  'British (RP)',
  'British (Regional)',
  'Australian',
  'Irish',
  'Scottish',
  'New York',
  'Midwest',
  'Spanish',
  'French',
  'Other',
];

const AGE_RANGE_OPTIONS = ['18-25', '26-35', '36-45', '46-55', '55+', 'Any'];

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
  const [accent, setAccent] = useState(savedFilters.accent || '');
  const [ageRange, setAgeRange] = useState(savedFilters.age_range || 'Any');

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
      accent,
      age_range: ageRange,
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
    setAccent('');
    setAgeRange('Any');
    localStorage.removeItem('drst-reader-filters');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-[#1E1E1E] px-5 pb-5 pt-4 sm:rounded-2xl sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white sm:text-lg">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#666666] transition-colors hover:bg-[#2A2A2A] hover:text-[#999999]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 sm:space-y-6 sm:max-h-[60vh]">
          {/* Genre */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white">
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
                        ? 'bg-[#A7ECDA] text-white'
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
            <h3 className="mb-2 text-sm font-semibold text-white">
              Experience Level
            </h3>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#2A2A2A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF8280]"
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
            <h3 className="mb-2 text-sm font-semibold text-white">
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
            <h3 className="mb-2 text-sm font-semibold text-white">
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

          {/* Accent */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white">
              Accent
            </h3>
            <select
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="w-full rounded-lg border border-[#3A3A3A] bg-[#2A2A2A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF8280]"
            >
              <option value="">Any</option>
              {ACCENT_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Age Range */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white">
              Age Range
            </h3>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAgeRange(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    ageRange === option
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
            <h3 className="mb-2 text-sm font-semibold text-white">
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
        <div className="mt-4 flex gap-3 sm:mt-6">
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
            className="flex-1 rounded-lg bg-[#FF8280] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ff6e6c]"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReaderFilters;
