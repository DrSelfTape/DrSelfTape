import { useState, useEffect } from 'react';
import { CrossIcon } from '../../../assets/icons';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export const FilePicker = ({
  label,
  name,
  onChange,
  disabled = false,
  error = false,
  errorMsg = '',
  className = '',
  placeholder = 'Choose a file',
  accept = '',
  required,
  icon,
  title,
  url = '',
  view,
}) => {
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (url) {
      const urlFileName = url.split('/').pop().split('?')[0];
      setFileName(urlFileName);
    }
  }, [url]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : '');
    onChange(e);
  };

  const handleClear = () => {
    setFileName('');
    onChange({ target: { name, value: null, files: [] } });
  };

  const handleViewFile = () => {
    if (fileName) {
      if (url) {
        // Open URL if provided
        window.open(url, '_blank');
      } else {
        const fileInput = document.querySelector(`input[name="${name}"]`);
        const file = fileInput?.files[0];
        if (file) {
          const fileUrl = URL.createObjectURL(file);
          window.open(fileUrl, '_blank');
        }
      }
    }
  };

  return (
    <div className='relative w-full'>
      {label && !title && (
        <label
          className={`absolute left-3 text-xs ${
            required ? '-top-[12px]' : '-top-[8px]'
          } text-nowrap z-10 bg-white px-1 transition-all duration-200
            ${error ? 'text-danger' : 'text-input-title'}
          `}
        >
          {label}
          {required && <span className='text-danger text-[16px] ml-1'>*</span>}
        </label>
      )}
      {icon ||
        (title && (
          <div className='flex gap-0.5 items-center mb-1 pl-2 truncate max-w-[50%]'>
            <div className='flex items-center gap-1 text-sm font-medium text-secondary-dark'>
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
        ))}
      <div className='relative w-full'>
        <input
          type='file'
          name={name}
          onChange={handleFileChange}
          disabled={disabled}
          accept={accept}
          className={`w-full px-3 py-2 min-w-[180px] h-[36px] sm:h-[40px] border text-input-size rounded transition-all text-black
            ${disabled ? 'bg-input-disabled cursor-not-allowed' : 'bg-white'}
            ${
              error
                ? 'border-danger focus:border-danger'
                : 'border-input hover:border-input-hover focus:border-input-active'
            }
            focus:outline-none pr-16
            hidden
          `}
          id={`${name}-file-input`}
        />
        <div
          className={`w-full px-3 py-2 min-w-[180px] h-[36px] sm:h-[40px] border text-input-size rounded transition-all text-black
            ${disabled ? 'bg-input-disabled cursor-not-allowed' : 'bg-white'}
            ${
              error
                ? 'border-danger focus:border-danger'
                : 'border-input hover:border-input-hover focus:border-input-active'
            }
            flex items-center justify-between cursor-pointer ${className}
          `}
          onClick={() =>
            !disabled && document.getElementById(`${name}-file-input`).click()
          }
        >
          <span
            className={`${fileName ? 'text-black truncate' : 'text-input-placeholder'}`}
          >
            {fileName || placeholder}
          </span>
          <div className='flex items-center gap-2'>
            {fileName && (
              <>
                <OpenInNewIcon
                  sx={{
                    fontSize: '18px',
                    color: 'var(--color-input-placeholder)',
                  }}
                  className='cursor-pointer'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewFile();
                  }}
                />
                {!view && (
                  <CrossIcon
                    className='size-4 cursor-pointer text-input-placeholder'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
        {error && (
          <span className='text-[11px] text-danger ml-1 block absolute top-[40px]'>
            {errorMsg}
          </span>
        )}
      </div>
    </div>
  );
};
