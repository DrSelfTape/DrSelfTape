import { InputLabel, Stack, TextField } from '@mui/material';
import { LocalizationProvider, renderTimeViewClock } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker as Picker } from '@mui/x-date-pickers/TimePicker';

export const TimePicker = ({
  value,
  label,
  name,
  disablePast,
  onChange,
  sx,
  variant = 'outlined',
  error,
  placeholder,
  required = false,
  icon,
  className,
  disabled = false,
  title,
}) => {
  const labelId = `${name}-label`;

  return (
    <div className='w-full relative'>
      {label && !title && (
        <InputLabel
          htmlFor={labelId}
          shrink
          className='custom-input-label'
          sx={{
            fontFamily: 'sans-serif',
            fontSize: '12px',
            color: error ? 'var(--color-danger)' : 'var(--color-input-title)',
            '&.Mui-focused': {
              color: error ? 'var(--color-danger)' : 'var(--color-input-title)',
            },
            '&.Mui-disabled': { color: 'var(--color-input-placeholder)' },
            position: 'absolute',
            top: required ? '-8px' : '-6px',
            left: '12px',
            backgroundColor: 'white',
            padding: '0 4px',
            zIndex: 1,
            transform: 'none',
            lineHeight: '1',
          }}
        >
          {label}
          {required && <span className='text-danger text-[16px] ml-1'>*</span>}
        </InputLabel>
      )}
      {(icon || title) && (
        <div className='flex gap-0.5 items-center mb-1'>
          <div className='flex items-center gap-1 text-sm font-medium text-gray-700'>
            {icon}
          </div>
          <p
            className={`text-[14px] text-nowrap px-1 transition-all duration-200 ${
              error ? 'text-danger' : 'text-input-title'
            }`}
          >
            {title}
          </p>
        </div>
      )}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack spacing={0}>
          <Picker
            labelId={labelId}
            className={className}
            value={value}
            disablePast={disablePast}
            disabled={disabled}
            onChange={onChange}
            slots={{ textField: TextField }}
            enableAccessibleFieldDOMStructure={false}
            viewRenderers={{
              hours: renderTimeViewClock,
              minutes: renderTimeViewClock,
              seconds: renderTimeViewClock,
            }}
            slotProps={{
              textField: {
                error: Boolean(error),
                size: 'small',
                variant,
                id: 'inputDate',
                placeholder: placeholder,
                inputProps: {
                  placeholder: placeholder,
                },
                sx: {
                  ...sx,
                  '& .MuiInputBase-input': {
                    height: 22,
                    fontSize: '13px',
                    '::placeholder': {
                      color: '#7f7f7f',
                      fontSize: '13px',
                      fontFamily: 'sans-serif',
                      opacity: 1,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    marginBottom: '0px',
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '20px',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: error
                      ? 'var(--color-danger)'
                      : 'var(--color-input-hover)',
                  },
                },
              },
            }}
          />
        </Stack>
      </LocalizationProvider>
    </div>
  );
};
