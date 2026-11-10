import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { setFiltersLocal } from '../../../redux/features/readers/readersMatchSlice';
import { patchUserSettings } from '../../../redux/features/userSettings/userSettingsSlice';
import useHideMobileHeader from '../../../components/Shared/useHideMobileHeader';

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

const UNION_OPTIONS = ['SAG-AFTRA', 'Non-Union', 'Both'];
const AVAILABILITY_OPTIONS = ['Online Now', 'Any'];

const ReaderFilters = ({ onClose }) => {
  useHideMobileHeader(true);
  const dispatch = useDispatch();
  const savedFilters = useSelector((state) => state.readersMatch.filters);

  const [genres, setGenres] = useState(savedFilters.genres || []);
  const [unionStatus, setUnionStatus] = useState(
    savedFilters.union_status || 'Both'
  );
  const [availability, setAvailability] = useState(
    savedFilters.availability || 'Any'
  );

  const toggleGenre = (genre) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleApply = () => {
    // Only what the deck query can honour (see deckFilterParams).
    const filters = {
      genres,
      union_status: unionStatus,
      availability,
    };

    dispatch(setFiltersLocal(filters));
    dispatch(patchUserSettings({ reader_filters: filters }));

    // No manual fetch here. patchUserSettings above changes savedFilters,
    // which the effect in FindAReader/index.jsx watches — it does the fetch.
    // Dispatching here as well meant one Apply tap fired three byte-identical
    // deck requests and blanked the deck to its loading state three times.
    onClose();
  };

  const handleReset = () => {
    setGenres([]);
    setUnionStatus('Both');
    setAvailability('Any');
    dispatch(patchUserSettings({ reader_filters: {} }));
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
      <div className="relative w-full max-w-md rounded-t-2xl bg-white px-5 pb-5 pt-4 sm:rounded-2xl sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0A0A0A] sm:text-lg">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[rgba(10,10,10,0.4)] transition-colors hover:bg-[#F4F4EE] hover:text-[rgba(10,10,10,0.62)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 sm:space-y-6 sm:max-h-[60vh]">
          {/* Genre */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#0A0A0A]">
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
                        ? 'bg-[#A7ECDA] text-[#0A0A0A]'
                        : 'bg-[#F4F4EE] text-[rgba(10,10,10,0.62)] hover:bg-gray-200'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Union Status */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#0A0A0A]">
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
                      ? 'bg-transparent text-[#0A0A0A]'
                      : 'bg-[#F4F4EE] text-[rgba(10,10,10,0.62)] hover:bg-gray-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#0A0A0A]">
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
                      ? 'bg-transparent text-[#0A0A0A]'
                      : 'bg-[#F4F4EE] text-[rgba(10,10,10,0.62)] hover:bg-gray-200'
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
            className="flex-1 rounded-lg border border-[rgba(10,10,10,0.14)] px-4 py-2.5 text-sm font-medium text-[rgba(10,10,10,0.62)] transition-colors hover:bg-white"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 rounded-lg bg-[#D4A85F] px-4 py-2.5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-[#ff6e6c]"
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
