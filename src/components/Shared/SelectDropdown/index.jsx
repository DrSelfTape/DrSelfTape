// Library imports
import { useState, useRef, useEffect } from 'react';

// Local imports
import { ArrowHeadIcon, CrossIcon, TickIcon } from '../../../assets/icons';

export const SelectDropdown = ({
  label,
  multipleSelect = false,
  onChange,
  optionsArray = [],
  disabled = false,
  error = false,
  errorMsg = '',
  limitTags = null,
  value = null,
  className = '',
}) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const getId = (item) => (typeof item === 'object' ? item.id : item);
  const getName = (item) =>
    item && typeof item === 'object' && item.name ? item.name : item;

  const selectedValues = multipleSelect
    ? Array.isArray(value)
      ? value
      : []
    : value;

  const isSelected = (option) => {
    const optionId = getId(option);
    if (multipleSelect) {
      return selectedValues.some((val) => getId(val) === optionId);
    }
    return selectedValues && getId(selectedValues) === optionId;
  };

  const handleOptionClick = (option) => {
    let updated;

    if (multipleSelect) {
      const isAlreadySelected = selectedValues.some(
        (item) => getId(item) === getId(option)
      );

      updated = isAlreadySelected
        ? selectedValues.filter((item) => getId(item) !== getId(option))
        : [...selectedValues, option];
    } else {
      updated = option;
    }

    const returnback =
      typeof optionsArray[0] === 'object'
        ? updated
        : multipleSelect
        ? updated.map(getId)
        : getId(updated);

    onChange?.(returnback);
    if (!multipleSelect) setOpen(false);
    setSearch('');
  };

  const handleRemove = (e, id) => {
    e.stopPropagation();
    const updated = selectedValues.filter((item) => getId(item) !== id);
    const returnback =
      typeof optionsArray[0] === 'object' ? updated : updated.map(getId);
    onChange?.(returnback);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange?.(multipleSelect ? [] : null);
    setSearch('');
  };

  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setOpen(false);
      setSearch('');
    }
  };

  const handleDropdown = () => {
    if (!open) {
      const selectDiv = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - selectDiv.bottom;
      const spaceAbove = selectDiv.top;
      setDropUp(spaceBelow < 240 && spaceAbove > 240);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
    setOpen((prev) => !prev);
  };

  const filteredOptions = Array.isArray(optionsArray)
    ? (() => {
        const seen = new Set();
        return optionsArray.filter((option) => {
          const id = getId(option);
          const name = getName(option);

          if (seen.has(id)) return false;
          seen.add(id);

          return String(name).toLowerCase().includes(search.toLowerCase());
        });
      })()
    : [];

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTo({
        left: container.scrollWidth,
        behavior: 'smooth',
      });
    }
    inputRef.current?.focus();
  }, [value]);

  const limitDisplay =
    multipleSelect && limitTags
      ? selectedValues.slice(0, limitTags)
      : selectedValues;

  return (
    <div className={`relative w-full mt-4 ${className}`}>
      {label && (
        <label
          className={`absolute left-3 -top-[10px] z-20 bg-white px-1 text-input-title-size transition-all duration-200
            ${error ? 'text-danger' : 'text-input-title'}
          `}
        >
          {label}
        </label>
      )}
      <div
        ref={dropdownRef}
        className={`relative w-full`}
      >
        <div
          onClick={disabled ? undefined : handleDropdown}
          className={`border px-3 sm:py-2 min-w-[300px]  ${!multipleSelect ? 'h-[28px] sm:h-[36px]': 'h-[36px]'}  flex items-center gap-2 flex-wrap rounded transition-all
            ${
              open
                ? dropUp
                  ? 'rounded-t-none mb-[17px]'
                  : 'rounded-t rounded-b-none'
                : 'rounded'
            }
mb-[17px]

            ${
              disabled
                ? 'bg-input-disabled cursor-not-allowed'
                : 'bg-white cursor-pointer'
            }
            ${
              error
                ? 'border-danger'
                : 'border-input hover:border-input-hover focus-within:border-input-active'
            }
          `}
        >
          {multipleSelect &&
            Array.isArray(selectedValues) &&
            selectedValues.length > 0 && (
              <div
                ref={scrollRef}
                className='flex gap-2 max-w-[150px] overflow-auto invisible-scrollbar'
              >
                {limitDisplay.map((item) => (
                  <div
                    key={getId(item)}
                    className='bg-primary-light text-primary text-input-size text-nowrap px-2 sm:py-1 rounded flex items-center gap-1'
                  >
                    <span>{getName(item)}</span>
                    <span
                      onClick={(e) => handleRemove(e, getId(item))}
                      className='cursor-pointer pt-[2px]'
                    >
                      <CrossIcon width={12} height={12} />
                    </span>
                  </div>
                ))}
                {selectedValues.length > limitDisplay.length && (
                  <div className='bg-primary-light text-primary text-xs px-2 py-1 rounded'>
                    +{selectedValues.length - limitDisplay.length}
                  </div>
                )}
              </div>
            )}

          {!multipleSelect && selectedValues && (
            <span className='text-black text-sm'>
              {getName(selectedValues)}
            </span>
          )}

          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            placeholder={
              (multipleSelect ? selectedValues.length === 0 : !selectedValues)
                ? 'Select option'
                : ''
            }
            className={`flex-1 min-w-[50px] outline-none text-sm px-1 bg-transparent
              text-black placeholder-input-placeholder
              ${disabled ? 'cursor-not-allowed pointer-events-none' : ''}
            `}
          />

          {(multipleSelect ? selectedValues.length > 0 : selectedValues) &&
            !disabled && (
              <span
                onClick={handleClearAll}
                className='text-danger cursor-pointer ml-auto'
              >
                <CrossIcon width={14} height={14} />
              </span>
            )}

          <span className='ml-2 text-input-placeholder'>
            <ArrowHeadIcon
              className={`transition-transform duration-200 ${
                open && !disabled ? 'rotate-180' : ''
              }`}
            />
          </span>
        </div>

        {error && !open && (
          <span className='text-[11px] text-danger ml-3.5 block absolute'>
            {errorMsg}
          </span>
        )}

        {open && !disabled && (
          <div
            className={`absolute z-30 w-full min-w-[300px] bg-white border max-h-60 overflow-auto invisible-scrollbar text-sm
              ${error ? 'border-danger' : 'border-input'}
              ${
                dropUp
                  ? 'bottom-full rounded-t border-b-0'
                  : 'top-full rounded-b border-t-0'
              }
            `}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={getId(option)}
                  onClick={() => handleOptionClick(option)}
                  className={`px-4 py-2 cursor-pointer flex items-center hover:bg-primary-light ${
                    isSelected(option) ? 'bg-primary-light' : ''
                  }`}
                >
                  {getName(option)}
                  {isSelected(option) && (
                    <span className='ml-auto'>
                      <TickIcon />
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className='px-4 py-2 text-input-placeholder'>
                No options found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
