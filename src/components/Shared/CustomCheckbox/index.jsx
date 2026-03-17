// Library imports
import FormControlLabel from '@mui/material/FormControlLabel';

// Local imports
import Checkbox from '@mui/material/Checkbox';

export const CustomCheckbox = ({
  checked,
  onChange,
  setChecked,
  label,
  name = '',
  sx,
  required = false,
}) => {
  const handleChange = (event) => {
    setChecked(event.target.checked);
  };

  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          name={name}
          onChange={onChange || handleChange}
          sx={{
            '&.Mui-checked': {
              color: 'primary.main',
              fontSize: 16,
            },
            '& .MuiSvgIcon-root': {
              fontSize: 18,
            },
          }}
        />
      }
      sx={{
        padding: '0',
        width: 'fit-content',
        userSelect: 'none',
        '& .MuiFormControlLabel-label': {
          color: 'gray',
          paddingTop: '2.5px',
          fontSize: '14px',
        },
        '& .MuiSvgIcon-root': {
          color: 'primary.main',
        },
        ...sx,
      }}
      label={
        <span>
          {label}
          {required && (
           required && <span className='text-red-800 text-[16px] ml-1'>*</span>
          )}
        </span>
      }
    />
  );
};
