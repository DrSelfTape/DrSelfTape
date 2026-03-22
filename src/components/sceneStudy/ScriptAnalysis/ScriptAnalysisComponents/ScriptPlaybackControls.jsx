import { useEffect } from 'react';
import {
  PreviousIcon,
  NextIcon,
  PlayIcon,
  PauseIcon,
  ResetIcon,
} from '../../../../assets/icons';
import { SelectDropdown } from '../../../Shared';
import { toneOptions, speedOptions } from '../../../../utils/data';
import { VolumeControl } from './VolumeControl';

export const ScriptPlaybackControls = ({
  currentLineIndex,
  scriptLinesLength,
  isPlaying,
  onPrevious,
  onNext,
  onPlayPause,
  onReset,
  selectedTone,
  setSelectedTone,
  selectedAudioSpeed,
  setSelectedAudioSpeed,
  selectedVolume,
  setSelectedVolume,
}) => {
  const handleChange = (e) => {
    const { value, name } = e.target;
    if (name === 'selectTone') {
      setSelectedTone(value);
    } else {
      setSelectedAudioSpeed(value);
    }
  };

  return (
    <div className='sticky top-0 z-10 border-b border-gray-200 py-4 px-4 lg:px-6 bg-blue-50/50'>
      <div className='flex flex-col lg:flex-row items-center justify-between gap-4'>
        <VolumeControl
          selectedVolume={selectedVolume}
          setSelectedVolume={setSelectedVolume}
        />
        {/* Playback Controls*/}
        <div className='flex items-center justify-center gap-3 flex-shrink-0'>
          <button
            onClick={onPrevious}
            disabled={currentLineIndex === 0}
            className={`rounded-md border border-gray-200 transition-all size-[2.4rem] flex items-center justify-center ${
              currentLineIndex === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-100 active:scale-95 cursor-pointer'
            }`}
            title='Previous line'
          >
            <PreviousIcon className='size-5 text-gray-600' />
          </button>

          <button
            onClick={onPlayPause}
            className={`rounded-full border border-gray-200 transition-all cursor-pointer duration-200 p-3 shadow-sm flex items-center justify-center w-14 h-14 ${
              isPlaying
                ? 'bg-blue-100 scale-105 border-blue-300'
                : 'bg-white hover:bg-gray-100 active:scale-95'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <PauseIcon className='size-7 text-blue-500' />
            ) : (
              <PlayIcon className='size-6 text-blue-500 ml-1' />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={currentLineIndex === scriptLinesLength - 1}
            className={`rounded-md border border-gray-200 transition-all size-[2.4rem] flex items-center justify-center ${
              currentLineIndex === scriptLinesLength - 1
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-100 active:scale-95 cursor-pointer'
            }`}
            title='Next line'
          >
            <NextIcon className='size-5 text-gray-600' />
          </button>

          <button
            onClick={onReset}
            className='rounded-md border border-gray-200 transition-all cursor-pointer size-[2.4rem] flex items-center justify-center hover:bg-gray-100 active:scale-95'
            title='Reset to beginning'
          >
            <ResetIcon className='text-primary' />
          </button>
        </div>

        {/* Speed and Tone Controls */}
        <div className='flex items-center gap-2 flex-shrink-0 w-full lg:w-auto justify-center lg:justify-end'>
          <SelectDropdown
            value={selectedAudioSpeed}
            name={'selectAudioSpeed'}
            onChange={handleChange}
            options={speedOptions}
            placeholder={false}
            className='!min-w-[60px] !h-[32px]'
          />
          <SelectDropdown
            value={selectedTone}
            name={'selectTone'}
            onChange={handleChange}
            options={toneOptions}
            placeholder={false}
            className='!min-w-[110px] !h-[32px]'
          />
        </div>
      </div>
    </div>
  );
};

