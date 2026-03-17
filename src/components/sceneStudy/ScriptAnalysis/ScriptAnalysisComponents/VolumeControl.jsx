// Library imports
import { useEffect } from 'react';

// Icon imports
import { VolumeIcon, VolumeXIcon } from '../../../../assets/icons';

export const VolumeControl = ({ selectedVolume, setSelectedVolume }) => {
  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value, 10);
    setSelectedVolume(newVolume);
  };
  const toggleMute = () => {
    if (selectedVolume === 0) {
      setSelectedVolume(100);
    } else {
      setSelectedVolume(0);
    }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .volume-slider::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: 2px solid #fff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      .volume-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        border: 2px solid #fff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      .volume-slider:focus {
        outline: none;
      }
      .volume-slider:focus::-webkit-slider-thumb {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
      }
      .volume-slider:focus::-moz-range-thumb {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className='flex items-center gap-3 flex-shrink-0 w-full lg:w-auto justify-center lg:justify-start'>
      <button
        onClick={toggleMute}
        className='flex items-center justify-center transition-all hover:bg-gray-100 active:scale-95 rounded-md p-1.5'
        title={selectedVolume === 0 ? 'Unmute' : 'Mute'}
      >
        {selectedVolume === 0 ? (
          <VolumeXIcon
            className='size-5 text-gray-600'
            width={20}
            height={20}
          />
        ) : (
          <VolumeIcon className='size-5 text-gray-600' width={20} height={20} />
        )}
      </button>
      <div className='flex-1 flex items-center gap-2 min-w-[120px] max-w-[200px]'>
        <input
          type='range'
          min='0'
          max='100'
          value={selectedVolume}
          onChange={handleVolumeChange}
          className='flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer volume-slider'
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${selectedVolume}%, #e5e7eb ${selectedVolume}%, #e5e7eb 100%)`,
          }}
        />
        <span className='text-xs text-gray-600 font-medium w-10 text-right whitespace-nowrap'>
          {selectedVolume}%
        </span>
      </div>
    </div>
  );
};

