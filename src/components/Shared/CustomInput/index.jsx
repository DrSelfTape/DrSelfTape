// Library imports
import { useState } from 'react';
import { CrossIcon } from '../../../assets/icons';
// Local imports
import { CloseEyeIcon, OpenEyeIcon } from '../../../assets/icons';

export const CustomInput = ({
  label,
  value = '',
  name,
  onChange,
  type = 'text',
  disabled = false,
  error = false,
  errorMsg = '',
  className = '',
  placeholder,
  autoFocus = false,
  autoComplete = 'off',
  isSearch = false,
  handleSearchClear,
  onSearch,
  required = false,
  ref,
  icon,
  title,
  dark = false,   // ← dark mode for auth pages
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleKeyDown = (e) => {
    if (type === 'number' && !/[0-9]/.test(e.key) && e.key !== 'Backspace') {
      e.preventDefault();
    }
    if (isSearch && e.key === 'Escape' && value?.length > 0) {
      handleSearchClear?.();
    }
    if (isSearch && e.key === 'Enter' && value?.length > 0) {
      e.preventDefault();
      onSearch?.(value);
    }
  };

  // `dark` is the auth-page surface: deliberately dark whatever the app
  // theme is, so it carries its own ink. Everything else runs on tokens.
  // Placeholder and focus border moved up a rung — the old values measured
  // 3.0:1 and 2.1:1 on paper, under the floor for text and for a boundary.
  const bgClass   = dark ? 'bg-[#111318]' : (disabled ? 'bg-input-disabled cursor-not-allowed text-[var(--dst-ink-3)]' : 'bg-[var(--dst-surface)]');
  const textClass = dark ? 'text-white placeholder-[#8B8B96]' : 'text-[var(--dst-ink)] placeholder-[var(--dst-ink-3)]';
  const borderBase = dark
    ? 'border-[#2a2d35] hover:border-[var(--dst-brass-light)]/60 focus:border-[var(--dst-brass-light)]'
    : 'border-[var(--dst-line-soft)] hover:border-[var(--dst-line-strong)] focus:border-[var(--dst-brass-ui)]';
  const borderErr = 'border-danger focus:border-danger';
  const labelBg   = dark ? 'bg-[#111318]' : 'bg-[var(--dst-surface)]';
  const labelColor = dark ? (error ? 'text-danger' : 'text-[#B5B5BE]') : (error ? 'text-danger' : 'text-[var(--dst-ink-2)]');

  return (
    <div className="relative w-full">
      {label && !title && (
        <label
          className={`absolute left-3 text-xs ${
            required ? '-top-[12px]' : '-top-[8px]'
          } text-nowrap z-10 ${labelBg} px-1 transition-all duration-200 ${labelColor}`}
        >
          {label}
          {required && <span className="text-danger text-[16px] ml-1">*</span>}
        </label>
      )}
      {(icon || title) && (
        <div className="flex gap-0.5 items-center mb-1">
          <div className="flex items-center gap-1 text-sm font-medium text-[var(--dst-ink-2)]">
            {icon}
          </div>
          <p className={`text-[14px] text-nowrap px-1 transition-all duration-200 ${error ? 'text-danger' : 'text-[var(--dst-ink)]'}`}>
            {title}
          </p>
        </div>
      )}

      <div className="relative w-full">
        <input
          type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoFocus={autoFocus}
          ref={ref}
          autoComplete={autoComplete}
          onKeyDown={type === 'number' ? handleKeyDown : undefined}
          className={`w-full px-4 py-2 min-w-[180px] h-[44px] sm:h-[48px] border text-input-size rounded-xl transition-all
            ${bgClass} ${textClass}
            ${error ? borderErr : borderBase}
            ${type === 'number' ? 'no-spinner' : ''}
            focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dst-brass-ui)] pr-10
            ${className}
          `}
          placeholder={!value ? placeholder : ''}
        />

        {type === 'password' && !disabled && !isSearch && (
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center size-11 -mr-3 cursor-pointer ${dark ? 'text-[#B5B5BE]' : 'text-[var(--dst-ink-3)]'}`}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <CloseEyeIcon className="size-5" /> : <OpenEyeIcon className="size-5" />}
          </span>
        )}

        {error && (
          <span className="text-[11px] text-danger ml-1 block absolute top-[40px]">
            {errorMsg}
          </span>
        )}
      </div>
    </div>
  );
};
