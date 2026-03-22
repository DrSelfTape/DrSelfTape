import { ScriptUploadIcon } from '../../../assets/icons';
import { CustomButton } from '../../Shared';

const ScriptUpload = ({
  fileInputRef,
  selectedFile,
  error,
  onFileChange,
  onClear,
  onView,
  onSubmit,
  loading,
}) => {
  return (
    <div className='card-section border-style !p-3 sm:!p-5'>
      <h1 className='text-base sm:text-lg font-semibold text-secondary-dark mb-3'>
        Upload Script
      </h1>
      <div
        className='relative border-2 border-dashed rounded-lg p-5 sm:p-6
                   transition-colors duration-200 cursor-pointer
                   border-input hover:border-primary hover:bg-primary-light'
      >
        <input
          ref={fileInputRef}
          type='file'
          accept='.pdf,.txt,.docx'
          onChange={onFileChange}
          className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
        />
        <div className='flex flex-col items-center gap-2 text-center pointer-events-none relative z-20'>
          <ScriptUploadIcon />
          <h3 className='text-sm sm:text-base font-medium text-secondary-dark'>
            Click anywhere to upload
          </h3>
          <p className='text-xs sm:text-sm text-secondary'>
            Supports PDF, TXT, DOCX
          </p>
          {error && <p className='text-xs sm:text-sm text-danger'>{error}</p>}
          {selectedFile && (
            <div className='flex flex-col items-center mt-3 w-full gap-3'>
              <p className='text-xs sm:text-sm font-medium text-secondary truncate w-full text-center'>
                {selectedFile.name}
              </p>
              <div className='flex flex-wrap justify-center gap-2 pointer-events-auto'>
                <CustomButton
                  onClick={onView}
                  variant='outlined'
                  className='!h-8 !px-4 !py-2 !text-sm !font-medium
                             border border-primary text-primary
                             hover:bg-primary-light hover:border-primary hover:text-primary
                             focus:outline-none transition-colors duration-200'
                >
                  View
                </CustomButton>
                <CustomButton
                  onClick={onClear}
                  variant='outlined'
                  isDelete={true}
                  className='!h-8 !px-4 !py-2 !text-sm !font-medium'
                >
                  Clear
                </CustomButton>
                <CustomButton
                  onClick={onSubmit}
                  loading={loading}
                  disabled={loading}
                  variant='outlined'
                  className='!h-8 !px-4 !py-2 !text-sm !font-medium
                             !border !border-success !text-success
                             hover:!bg-success hover:!text-white
                             focus:!outline-none !transition-colors !duration-200'
                >
                  Submit
                </CustomButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptUpload;
