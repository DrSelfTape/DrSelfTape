import TextField from '@mui/material/TextField';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { DesktopDatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { InputLabel } from '@mui/material';

export const DatePicker = ({
  label,
  fullWidth,
  size,
  onChange,
  name,
  value,
  className,
  helperText,
  color,
  disablePast,
  error,
  PopperProps,
  sx,
  variant = 'outlined',
  errorMsg,
  required = false,
  icon,
  disabled = false,
  title,
  views
}) => {
  const labelId = `${name}-label`;
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className='relative flex flex-col'>
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
                color: error
                  ? 'var(--color-danger)'
                  : 'var(--color-input-active)',
              },
              '&.Mui-disabled': { color: 'var(--color-input-placeholder)' },
              position: 'absolute',
              top: required ? '-8px' : '-6px',
              left: '12px',
              backgroundColor: 'var(--color-white)',
              padding: '0 4px',
              zIndex: 1,
              transform: 'none',
              lineHeight: '1',
            }}
          >
            {label}
            {required && (
              <span className='text-danger text-[16px] ml-1'>*</span>
            )}
          </InputLabel>
        )}
        {icon ||
          (title && (
            <div className='flex gap-0.5 items-center mb-1'>
              <div className='flex items-center gap-1 text-sm font-medium text-[var(--color-secondary-dark)] '>
                {icon}
              </div>
              <p
                className={`text-[14px] 
           text-nowrap  px-1 transition-all duration-200
            ${error
                    ? 'text-[var(--color-danger)]'
                    : 'text-[var(--color-secondary-dark)]'
                  }
          `}
              >
                {title}
              </p>
            </div>
          ))}
        <DesktopDatePicker
          labelId={labelId}
          value={value}
          disabled={disabled}
          name={name}
          onChange={onChange}
          disablePast={disablePast}
          PopperProps={PopperProps}
          enableAccessibleFieldDOMStructure={false}
          slots={{ textField: TextField }}
          view={views}
          slotProps={{
            textField: {
              fullWidth,
              size,
              helperText,
              className,
              color,
              error: Boolean(error),
              variant,
              sx: {
                ...sx,
                '& .MuiInputBase-root': {
                  minHeight: '36px',
                  height: { xs: 36, sm: 40 },
                  padding: '0',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                },

                '& .MuiOutlinedInput-input': {
                  padding: '8px 12px',
                  fontSize: '14px',
                },
                '& .MuiInputLabel-root': {
                  color: error ? 'var(--color-danger)' : '',
                  marginBottom: '0px',
                },
                '& .MuiInputAdornment-root': {
                  marginRight: '4px',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: error
                    ? 'var(--color-danger)'
                    : 'var(--color-input-hover)',
                },
                '& .MuiIconButton-root': {
                  padding: '4px',
                  marginRight: '0px',
                },

                '& .MuiSvgIcon-root': {
                  fontSize: '18px',
                },
                '& .MuiFormHelperText-root.Mui-error': {
                  color: 'var(--color-danger)',
                  marginTop: '0px',
                  position: 'absolute',
                  top: 40,
                  fontSize: '11px',
                  paddingRight: '10px',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
                popper: {
                  modifiers: [
                    {
                      name: 'sameWidth',
                      enabled: true,
                      phase: 'beforeWrite',
                      requires: ['computeStyles'],
                      fn: ({ state }) => {
                        state.styles.popper.width = `${state.rects.reference.width}px`;
                      },
                    },
                  ],
                },
              },
            },
          }}
          sx={{
            '&.Mui-disabled': {
              cursor: 'not-allowed',
              color: 'var(--color-primary)',
            },
          }}
        />
        {errorMsg && (
          <span className='text-[11px] text-[var(--color-danger)] ml-1 block absolute top-[40px]'>
            {errorMsg}
          </span>
        )}
      </div>
    </LocalizationProvider>
  );
};
