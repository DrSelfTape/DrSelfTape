import { InputLabel, TextField } from '@mui/material';

export const Textarea = ({
  label,
  value = '',
  name,
  onChange,
  disabled = false,
  error = false,
  errorMsg = '',
  className = '',
  placeholder = '',
  rows = 4,
  required,
  icon,
  title,
}) => {
  const labelId = `${name}-label`;
  return (
    <div className={`relative w-full`}>
      {label && !title && (
        <InputLabel
          htmlFor={labelId}
          shrink
          className='custom-input-label'
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '12px',
            color: error
              ? 'var(--color-danger)'
              : 'var(--color-input-placeholder)',
            '&.Mui-focused': {
              color: error
                ? 'var(--color-danger)'
                : 'var(--color-input-placeholder)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: error
                ? 'var(--color-danger)'
                : 'var(--color-input-hover)',
            },
            '&.Mui-disabled': { color: 'var(--color-input-placeholder)' },
            position: 'absolute',
            top: required ? '-8.5px' : '-5.5px',
            left: '12px',
            backgroundColor: 'var(--color-white)',
            padding: '0 4px',
            zIndex: 1,
            transform: 'none',
            lineHeight: '1',
          }}
        >
          {label}
          {required && <span className='text-[16px] ml-1 text-danger'>*</span>}
        </InputLabel>
      )}
      {icon ||
        (title && (
          <div className='flex gap-0.5 items-center mb-1'>
            <div className='flex items-center gap-1 text-sm font-medium text-[var(--color-secondary-dark)]'>
              {icon}
            </div>
            <p
              className={`text-[14px] text-nowrap px-1 transition-all duration-200
              ${error ? 'text-danger' : 'text-secondary-dark'}
            `}
            >
              {title}
            </p>
          </div>
        ))}
      <TextField
        id={labelId}
        name={name}
        className={className}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        multiline
        rows={rows}
        fullWidth
        error={error}
        sx={{
          '& .MuiInputBase-root': {
            fontFamily: '"Inter", sans-serif',
            fontSize: '14px',
            color: 'var(--color-secondary-dark)',
            backgroundColor:
              !className &&
              (disabled ? 'var(--color-input-disabled)' : 'var(--color-white)'),
            borderRadius: '2px',
            padding: '9px 12px',
            '& fieldset': {
              borderColor: error ? 'var(--color-danger)' : 'var(--color-input)',
              borderWidth: '1px', // default border
            },
            '&:hover fieldset': {
              borderColor: error
                ? 'var(--color-danger)'
                : 'var(--color-input-hover)',
              borderWidth: '1px', // hover border same thickness
            },
            '&.Mui-focused fieldset': {
              borderColor: error
                ? 'var(--color-danger)'
                : 'var(--color-input-active)',
              borderWidth: '1px', // focused border same thickness
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: error
                ? 'var(--color-danger)'
                : 'var(--color-input-hover)',
              borderWidth: '1px',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: error
                ? 'var(--color-danger)'
                : 'var(--color-input-active)',
              border: '1px primary',
            },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: error ? 'var(--color-danger)' : 'var(--color-input)',
            borderWidth: '1px',
          },
          '& .MuiInputLabel-root': {
            fontFamily: '"Inter", sans-serif',
            fontSize: '12px',
            color: error ? 'var(--color-danger)' : 'var(--color-input-title)',
            backgroundColor: 'var(--color-white)',
            padding: '0 4px',
            transform: 'translate(14px, -6px) scale(0.75)',
            '&.Mui-focused': {
              color: error ? 'var(--color-danger)' : 'var(--color-input-title)',
              borderWidth: '1px',
            },
            '&.Mui-disabled': {
              color: 'var(--color-input-title)',
            },
          },
          '& .MuiInputBase-input': {
            // padding: '8px 12px',
          },
        }}
      />
      {error && (
        <span className='text-[11px] ml-1 block mt-1 text-danger'>
          {errorMsg}
        </span>
      )}
    </div>
  );
};
