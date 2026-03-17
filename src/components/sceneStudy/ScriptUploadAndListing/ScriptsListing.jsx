import { CircularProgress } from '@mui/material';
import {
  DeleteIcon,
  OpenEyeIcon,
  SaveprogressScriptIcon,
} from '../../../assets/icons';
import DescriptionSharpIcon from '@mui/icons-material/DescriptionSharp';
import LegendToggleSharpIcon from '@mui/icons-material/LegendToggleSharp';
import { CustomButton, CustomModal, TooltipText } from '../../Shared';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync, unstable_batchedUpdates } from 'react-dom';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getAuditionTypeIcon } from '../../../utils/auditionIcons';
import { useAnalysisLoading } from '../../../hooks/useAnalysisLoading';
import { useSnackbar } from '../../../hooks/useSnackbar';

const ScriptsListing = ({
  files,
  listingLoading,
  onDeleteFile,
  formatFileSize,
  deleteLoading,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  selectedScript,
  setSelectedScript,
  handleCloseDelete,
  variant = 'default',
  onStartRehearsal,
  auditions = [],
}) => {
  const navigate = useNavigate();
  const isAiPartner = variant === 'ai-partner';
  const { toast } = useSnackbar();
  
  // State for tracking which script is being analyzed
  const [analyzingScriptId, setAnalyzingScriptId] = useState(null);
  const { isAnalyzing, currentMessage, startAnalysis, stopAnalysis } = useAnalysisLoading();
  
  // Hard lock to prevent double-click navigation
  const navLockRef = useRef(false);
  // Ref to track analyzing file ID for immediate UI updates (bypasses React batching)
  const analyzingFileIdRef = useRef(null);
  // Force re-render trigger
  const [, forceUpdate] = useState(0);
  
  // Local message loop for ready status navigation
  const NAV_MESSAGES = [
    'Reading script...',
    'Identifying Characters...',
    'Generating Beats...',
    'Done.',
  ];
  const [navMessageIndex, setNavMessageIndex] = useState(0);
  const navIntervalRef = useRef(null);
  const navTimeoutRef = useRef(null);

  // Function to get audition type icon for a script
  const getScriptIcon = (script) => {
    if (!script?.id) {
      // Default icon if no script ID
      return {
        Icon: DescriptionSharpIcon,
        bg: 'bg-primary',
        color: 'text-white',
      };
    }

    // Find audition that references this script via script_info.id
    const matchingAudition = auditions.find(
      (audition) => audition?.script_info?.id === script.id
    );

    if (matchingAudition?.audition_type) {
      // Found matching audition, use its audition_type
      const { icon: Icon, color, bg } = getAuditionTypeIcon(
        matchingAudition.audition_type.toLowerCase()
      );
      return {
        Icon,
        bg,
        color,
      };
    }

    // No matching audition found, use default icon
    return {
      Icon: DescriptionSharpIcon,
      bg: 'bg-primary',
      color: 'text-white',
    };
  };

  // Handle analyze button click for non-ready status (existing behavior)
  const handleAnalyze = (file) => {
    // Force immediate state updates for instant UI feedback
    flushSync(() => {
      // State 1: Immediately disable button (prevents double-click)
      setAnalyzingScriptId(file.id);
      
      // State 2 & 3: Start loading with spinner and looping messages
      startAnalysis();
    });
    
    // Navigate to analysis page which will trigger the analysis
    // The loading state will continue until extraction_status becomes 'ready'
    navigate(`/scene-study/analysis/${file.id}`);
  };

  // Handle analyze button click for ready status (navigation with message loop)
  const handleAnalyzeReady = (file) => {
    // Hard lock: prevent double-click
    if (navLockRef.current) return;
    
    // IMMEDIATELY set ref for instant UI feedback (no React batching)
    analyzingFileIdRef.current = file.id;
    navLockRef.current = true;
    
    // Force synchronous state update
    flushSync(() => {
      setAnalyzingScriptId(file.id);
      setNavMessageIndex(0);
    });
    
    // Start message loop immediately (change every 2 seconds)
    navIntervalRef.current = setInterval(() => {
      setNavMessageIndex((prev) => (prev + 1) % NAV_MESSAGES.length);
    }, 2000);
    
    // Calculate minimum duration for one full cycle (4 messages * 2 seconds = 8 seconds)
    const minDuration = NAV_MESSAGES.length * 2000;
    
    // After one full cycle, navigate
    navTimeoutRef.current = setTimeout(() => {
      // Navigate - messages will continue looping until component unmounts
      navigate(`/scene-study/analysis/${file.id}`);
    }, minDuration);
  };

  // Cleanup intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      if (navIntervalRef.current) {
        clearInterval(navIntervalRef.current);
        navIntervalRef.current = null;
      }
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
        navTimeoutRef.current = null;
      }
      navLockRef.current = false;
      analyzingFileIdRef.current = null;
    };
  }, []);

  // Stop analysis when extraction status becomes ready (for non-ready case)
  useEffect(() => {
    if (analyzingScriptId && files) {
      const script = files.find((f) => f.id === analyzingScriptId);
      if (script?.latest_version?.extraction_status === 'ready') {
        setAnalyzingScriptId(null);
        stopAnalysis();
      }
    }
  }, [files, analyzingScriptId, stopAnalysis]);

  const heading = isAiPartner
    ? 'Select a script to start rehearsal'
    : `Uploaded Scripts (${files?.length})`;

  if (!files?.length) {
    return listingLoading ? (
      <div className='flex w-full justify-center'>
        <CircularProgress size={40} className='!text-primary' />
      </div>
    ) : (
      <div className='card-section border-style flex flex-col items-center gap-4 p-4 sm:p-6'>
        <SaveprogressScriptIcon />
        <h3 className='text-base sm:text-lg font-semibold text-secondary-dark'>
          No scripts uploaded yet
        </h3>
        <p className='text-sm sm:text-base text-secondary'>
          Start by uploading some scripts above
        </p>
      </div>
    );
  }

  const formatDate = (date) =>
    date ? dayjs(date).format('MMM D, YYYY h:mm A') : 'N/A';

  const handlePreview = (url) => {
    if (url) window.open(url, '_blank');
  };

  const handlePrimaryAction = (file) => {
    if (isAiPartner) {
      onStartRehearsal?.(file);
      if (!onStartRehearsal) {
        navigate(`/scene-study/collaboration/ai-scene-partner/${file?.id}`, {
          state: { scriptId: file?.id, script: file },
        });
      }
      return;
    }
    navigate(`/scene-study/analysis/${file?.id}`);
  };

  return (
    <>
      <div className='card-section border-style !p-3 sm:!p-5 space-y-4'>
        <h2 className='text-lg sm:text-xl font-semibold text-secondary-dark'>
          {heading}
        </h2>
        <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
          {files.map((file) => (
         
            <div
              key={file?.id}
              className='group min-w-[250px] hover:shadow-md transition-all duration-300 hover:-translate-y-1 rounded-lg border border-style bg-white w-full'
            >
              <div className='p-4 sm:p-5'>
                <div className='flex flex-col space-y-3'>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-center space-x-2 sm:space-x-3'>
                      {(() => {
                        const { Icon, bg, color } = getScriptIcon(file);
                        return (
                          <div className={`p-2 sm:p-3 ${bg} rounded-lg`}>
                            <Icon
                              fontSize='small'
                              className={color}
                            />
                          </div>
                        );
                      })()}
                      <span className='text-xs sm:text-sm font-medium bg-primary-light text-primary px-2 py-1 rounded'>
                        {file?.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </span>
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <h3
                      className='font-medium text-sm sm:text-base truncate max-w-[12rem] sm:max-w-[16rem]'
                      title={file?.name}
                    >
                      {file?.latest_version?.filename}
                    </h3>
                    <div className='flex flex-col sm:flex-row justify-between text-xs sm:text-sm text-secondary'>
                      <span>
                        {formatFileSize(file?.latest_version?.file_size)}
                      </span>
                      <span>
                        {formatDate(file?.latest_version?.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className='flex space-x-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'>
                    <div className='flex flex-row flex-wrap gap-2'>
                      {file?.latest_version?.file_url && (
                        <CustomButton
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePreview(file.latest_version?.file_url);
                          }}
                          variant='outlined'
                          className='!h-8 sm:!h-9 !px-2 sm:!px-3 !py-1 !text-xs sm:!text-sm !font-medium
                                     !border !border-secondary !text-secondary-dark
                                     hover:!bg-secondary-light focus:!outline-none
                                     !transition-colors !duration-200 !w-full sm:!w-fit'
                        >
                          <OpenEyeIcon height={14} width={14} />
                          <span className='pl-1'>View</span>
                        </CustomButton>
                      )}

                      {isAiPartner ? (
                        file?.latest_version?.extraction_status !== 'ready' ? (
                          <TooltipText
                            text={`Extraction status is ${file?.latest_version?.extraction_status}`}
                          >
                            <span>
                              <CustomButton
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                variant='outlined'
                                disabled
                                className='!h-8 sm:!h-9 !px-2 sm:!px-3 !py-1 !text-xs sm:!text-sm !font-medium
                                           !border !border-secondary !text-secondary-dark
                                           hover:!bg-primary-light focus:!outline-none
                                           !transition-colors !duration-200 !w-full sm:!w-fit'
                              >
                                <LegendToggleSharpIcon fontSize='small' />
                                <span className='pl-0.5'>Start Rehearsal</span>
                              </CustomButton>
                            </span>
                          </TooltipText>
                        ) : (
                          <CustomButton
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handlePrimaryAction(file);
                            }}
                            variant='outlined'
                            className='!h-8 sm:!h-9 !px-2 sm:!px-3 !py-1 !text-xs sm:!text-sm !font-medium
                                       !border !border-secondary !text-secondary-dark
                                       hover:!bg-primary-light focus:!outline-none
                                       !transition-colors !duration-200 !w-full sm:!w-fit'
                          >
                            <LegendToggleSharpIcon fontSize='small' />
                            <span className='pl-0.5'>Start Rehearsal</span>
                          </CustomButton>
                        )
                      ) : (
                        <>
                          {file?.latest_version?.extraction_status !== 'ready' ? (
                            // Not ready: show disabled button with tooltip, show toast on click
                            <TooltipText
                              text={`Extraction status is ${file?.latest_version?.extraction_status}. Click to analyze.`}
                            >
                              <span>
                                <CustomButton
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Show toast with extraction status message
                                    toast.info(`Extraction status is ${file?.latest_version?.extraction_status}. Please wait for the script to be ready.`);
                                  }}
                                  variant='outlined'
                                  disabled
                                  className='!h-8 sm:!h-9 !px-2 sm:!px-3 !py-1 !text-xs sm:!text-sm !font-medium
                                             !border !border-secondary !text-secondary-dark
                                             !opacity-50 !cursor-not-allowed
                                             !w-full sm:!w-fit'
                                >
                                  <LegendToggleSharpIcon fontSize='small' />
                                  <span className='pl-0.5'>Analysis</span>
                                </CustomButton>
                              </span>
                            </TooltipText>
                          ) : (
                            // Ready status: same button, changes content when clicked
                            <CustomButton
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Prevent double-click
                                if (navLockRef.current || analyzingScriptId === file.id) return;
                                
                                // STEP 1: IMMEDIATELY set refs (happens synchronously, no React batching)
                                navLockRef.current = true;
                                analyzingFileIdRef.current = file.id;
                                
                                // STEP 2: Force immediate re-render by updating dummy state
                                forceUpdate(prev => prev + 1);
                                
                                // STEP 3: Update actual state (this will trigger another re-render but ref is already set)
                                setAnalyzingScriptId(file.id);
                                setNavMessageIndex(0);
                                
                                // STEP 4: Start message loop immediately (change every 0.75 seconds for 3 second total)
                                if (navIntervalRef.current) {
                                  clearInterval(navIntervalRef.current);
                                }
                                navIntervalRef.current = setInterval(() => {
                                  setNavMessageIndex((prev) => (prev + 1) % NAV_MESSAGES.length);
                                }, 750);
                                
                                // Calculate minimum duration for one full cycle (4 messages * 0.75 seconds = 3 seconds)
                                const minDuration = 3000;
                                
                                // After one full cycle, navigate
                                if (navTimeoutRef.current) {
                                  clearTimeout(navTimeoutRef.current);
                                }
                                navTimeoutRef.current = setTimeout(() => {
                                  navigate(`/scene-study/analysis/${file.id}`);
                                }, minDuration);
                              }}
                              variant='outlined'
                              disabled={analyzingScriptId === file.id || analyzingScriptId !== null || analyzingFileIdRef.current === file.id}
                              className='!h-8 sm:!h-9 !px-2 sm:!px-3 !py-1 !text-xs sm:!text-sm !font-medium
                                         !border !border-secondary !text-secondary-dark
                                         hover:!bg-primary-light focus:!outline-none
                                         !transition-colors !duration-200 !w-full sm:!w-fit
                                         disabled:!opacity-75 disabled:!cursor-not-allowed'
                            >
                              {(analyzingScriptId === file.id || analyzingFileIdRef.current === file.id) ? (
                                <>
                                  <CircularProgress 
                                    size={14} 
                                    className='!text-primary !mr-1.5' 
                                    sx={{ width: '14px !important', height: '14px !important' }}
                                  />
                                  <span className='pl-0.5 text-xs sm:text-sm font-medium text-secondary-dark'>
                                    {NAV_MESSAGES[navMessageIndex]}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <LegendToggleSharpIcon fontSize='small' />
                                  <span className='pl-0.5'>Analysis</span>
                                </>
                              )}
                            </CustomButton>
                          )}

                          {/* Hide delete button during analysis */}
                          {(analyzingScriptId !== file.id && analyzingFileIdRef.current !== file.id) && (
                            <CustomButton
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedScript(file);
                                setIsDeleteModalOpen(true);
                              }}
                              variant='outlined'
                              isDelete={true}
                              className='!h-8 sm:!h-9 !px-2 sm:!px-3 !py-1 !text-xs sm:!text-sm !font-medium !w-full sm:!w-fit'
                            >
                              <DeleteIcon height={16} width={16} />
                              <span className='pt-0.5 pl-1'>Delete</span>
                            </CustomButton>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <CustomModal
        open={isDeleteModalOpen}
        title='Delete Script'
        isDelete
        close={handleCloseDelete}
        primaryButtonText='Delete'
        saveButtonSx={{ width: { xxs: '100%', xs: '120px' } }}
        handleSave={() => {
          if (selectedScript) onDeleteFile(selectedScript.id);
        }}
        loading={deleteLoading}
      >
        {selectedScript && (
          <div className='pt-2 space-y-3'>
            <p className='text-secondary-dark font-medium text-sm sm:text-base'>
              Are you sure you want to delete this script?
            </p>
            <div className='border border-style rounded-lg p-3 bg-secondary-light flex flex-col gap-5 sm:flex-row sm:gap-0 justify-between items-start sm:items-center mb-5'>
              <div>
                <p className='text-sm font-semibold text-primary-dark'>
                  {selectedScript?.latest_version?.filename}
                </p>
                <p className='text-xs sm:text-sm text-secondary'>
                  Size:{' '}
                  {formatFileSize(selectedScript?.latest_version?.file_size)}
                </p>
                <p className='text-xs sm:text-sm text-secondary'>
                  Uploaded:{' '}
                  {formatDate(selectedScript?.latest_version?.created_at)}
                </p>
              </div>
              {selectedScript?.latest_version?.file_url && (
                <CustomButton
                  onClick={() =>
                    handlePreview(selectedScript.latest_version.file_url)
                  }
                  variant='outlined'
                  className='!h-8 sm:!h-9 !px-2 sm:!px-3 !py-1 !text-xs sm:!text-sm !font-medium
                             border-none text-primary
                             hover:bg-secondary-light focus:outline-none
                             transition-colors duration-200 mt-2 sm:mt-0 !w-full sm:!w-fit'
                >
                  <OpenEyeIcon
                    className='text-primary'
                    height={14}
                    width={14}
                  />
                  <span className='text-primary pl-1'>View</span>
                </CustomButton>
              )}
            </div>
          </div>
        )}
      </CustomModal>
    </>
  );
};

export default ScriptsListing;
