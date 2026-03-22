import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
export const SelectDropdown = ({
  label = '',
  value = '',
  name,
  onChange,
  disabled = false,
  error = false,
  errorMsg = '',
  placeholder = 'Click to select',
  options = [],
  sx = {},
  required = false,
  icon,
  className,
  title,
  labelSx,
  placeholderClassName,
  multiSelect = false,
}) => {
  const labelId = `${name}-label`;

  const normalizedValue = multiSelect
    ? Array.isArray(value)
      ? value
      : []
    : typeof value === 'object' && value !== null
      ? value.value ?? ''
      : value ?? '';

  const handleChange = (event) => {
    const selectedValue = event.target.value;

    if (multiSelect) {
      const selectedOptions = options.filter((opt) =>
        selectedValue.includes(opt.value)
      );
      onChange?.({
        ...event,
        target: { ...event.target, name, value: selectedOptions },
      });
    } else {
      const selectedOption = options.find(
        (opt) => opt.value === selectedValue
      );
      const returnValue = selectedOption ? selectedOption : selectedValue;
      onChange?.({
        ...event,
        target: { ...event.target, name, value: returnValue },
      });
    }
  };

  return (
    <div className='custom-input-container relative'>
      <FormControl fullWidth disabled={disabled} error={error}>
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
              '&.Mui-disabled': { color: 'var(--color-input-placeholder)' },
              position: 'absolute',
              top: required ? '-8px' : '-6px',
              left: '12px',
              backgroundColor: 'white',
              padding: '0 4px',
              zIndex: 1,
              transform: 'none',
              lineHeight: '1',
              ...labelSx,
            }}
          >
            {label}
           {required && <span className='text-danger text-[16px] ml-1'>*</span>}
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
                text-nowrap px-1 transition-all duration-200
                ${error ? 'text-danger' : 'text-secondary-dark'}
              `}
              >
                {title}
              </p>
            </div>
          ))}
        <Select
          labelId={labelId}
          id={labelId}
          className={className}
          displayEmpty
          multiple={multiSelect}
          value={
            multiSelect
              ? normalizedValue.map((v) => v.value || v)
              : normalizedValue
          }
          name={name}
          onChange={handleChange}
          renderValue={(selected) => {
            if (multiSelect) {
              if (!selected.length) {
                return (
                  <em
                    className={`text-input-placeholder not-italic text-[14px] font-sans ${placeholderClassName}`}
                  >
                    {placeholder}
                  </em>
                );
              }
              const labels = selected
                .map(
                  (val) =>
                    options.find((opt) => opt.value === val)?.label || val
                )
                .join(', ');
              return <span className='text-[12px]'>{labels}</span>;
            }

            if (!selected) {
              return (
                <em
                  className={`text-input-placeholder not-italic text-[14px] font-sans ${placeholderClassName}`}
                >
                  {placeholder}
                </em>
              );
            }
            const option = options.find((opt) => opt.value === selected);
            return (
              <span className='text-[12px]'>
                {option ? option.label : selected}
              </span>
            );
          }}
          inputProps={{
            style: {
              padding: '8px 40px 8px 12px',
            },
          }}
          sx={{
            height: { xs: '36px', sm: '40px' },
            minWidth: '180px',
            width: '100%',
            '& .MuiSelect-select': {
              fontSize: '14px',
              fontFamily: '"Inter", sans-serif',
              color: 'var(--color-secondary-dark)',
              padding: '0',
              paddingLeft: '10px',
              '&.Mui-disabled': {
                cursor: 'not-allowed',
              },
            },
            backgroundColor: disabled
              ? 'var(--color-input-disabled)'
              : 'var(--color-white)',
            borderRadius: '4px',
            '&.Mui-disabled': {
              cursor: 'not-allowed',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: error
                ? 'var(--color-danger)'
                : 'var(--color-input)',
              borderWidth: '1px',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: error
                ? 'var(--color-danger)'
                : 'var(--color-input-hover)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: error
                ? 'var(--color-danger)'
                : 'var(--color-input-active)',
              borderWidth: '1px',
            },
            ...sx,
          }}
        >
          {placeholder && (
            <MenuItem
              value=''
              sx={{
                fontSize: '14px',
                fontFamily: '"Inter", sans-serif',
                color: 'var(--color-input-secondary-dark)',
                fontStyle: 'normal',
                '&.Mui-selected': {
                  color: 'var(--color-secondary-dark)',
                  backgroundColor: 'var(--color-white)',
                  fontStyle: 'normal',
                },
                '&:hover': {
                  backgroundColor: 'var(--color-input-hover-20)',
                },
              }}
            >
              {placeholder}
            </MenuItem>
          )}
          {options.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
              sx={{
                fontSize: '14px',
                fontFamily: '"Inter", sans-serif',
                color: 'var(--color-secondary-dark)',
                fontStyle: 'normal',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                '&.Mui-selected': {
                  color: 'var(--color-secondary-dark)',
                  backgroundColor: 'var(--color-input-hover-30)',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: 'var(--color-input-hover-40)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'var(--color-input-hover-20)',
                },
              }}
            >
              <span>{option.label}</span>
              {multiSelect
                ? normalizedValue
                    .map((v) => v.value || v)
                    .includes(option.value) && (
                    <CheckIcon
                      sx={{ fontSize: '16px', color: 'var(--color-primary)' }}
                    />
                  )
                : normalizedValue === option.value && (
                    <CheckIcon
                      sx={{ fontSize: '16px', color: 'var(--color-primary)' }}
                    />
                  )}
            </MenuItem>
          ))}
        </Select>
        {error && (
          <span className='text-[11px] text-danger ml-1 block absolute top-[40px]'>
            {errorMsg}
          </span>
        )}
      </FormControl>
    </div>
  );
};
