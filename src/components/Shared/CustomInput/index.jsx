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

  const bgClass   = dark ? 'bg-[#111318]' : (disabled ? 'bg-input-disabled cursor-not-allowed text-input-placeholder' : 'bg-white');
  const textClass = dark ? 'text-white placeholder-[#555]' : 'text-black';
  const borderBase = dark
    ? 'border-[#2a2d35] hover:border-[#C855F0]/60 focus:border-[#C855F0]'
    : 'border-input hover:border-input-hover focus:border-input-active';
  const borderErr = 'border-danger focus:border-danger';
  const labelBg   = dark ? 'bg-[#111318]' : 'bg-white';
  const labelColor = dark ? (error ? 'text-danger' : 'text-[#888]') : (error ? 'text-danger' : 'text-input-title');

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
          <div className="flex items-center gap-1 text-sm font-medium text-secondary-dark">
            {icon}
          </div>
          <p className={`text-[14px] text-nowrap px-1 transition-all duration-200 ${error ? 'text-danger' : 'text-secondary-dark'}`}>
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
          autoComplete="off"
          onKeyDown={type === 'number' ? handleKeyDown : undefined}
          className={`w-full px-3 py-2 min-w-[180px] h-[36px] sm:h-[40px] border text-input-size rounded transition-all
            ${bgClass} ${textClass}
            ${error ? borderErr : borderBase}
            ${type === 'number' ? 'no-spinner' : ''}
            focus:outline-none pr-10
            ${className}
          `}
          placeholder={!value ? placeholder : ''}
        />

        {type === 'password' && !disabled && !isSearch && (
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer ${dark ? 'text-[#888]' : 'text-input-placeholder'}`}
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
