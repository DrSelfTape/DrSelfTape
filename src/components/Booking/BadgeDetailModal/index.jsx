import { useState, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { CustomModal, CustomButton } from '../../Shared';
import { CircularProgress } from '@mui/material';
import { getActorAuditions } from '../../../redux/features/actorAuditions/actorAuditionsSlice';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { useShareImageCapture } from '../../../hooks/useShareImageCapture';
import { InstagramShareTemplate } from './InstagramShareTemplate';
import { LinkedInShareTemplate } from './LinkedInShareTemplate';

export const BadgeDetailModal = ({ open, onClose, badge, totalAuditions = 0, totalCallbacks = 0 }) => {
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const { auditions, loading } = useSelector((state) => state?.actorAuditions);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageType, setImageType] = useState(null); // 'instagram' or 'linkedin'
  const [previewImage, setPreviewImage] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
  // Dedicated refs for each template
  const instagramTemplateRef = useRef(null);
  const linkedinTemplateRef = useRef(null);

  // Share image capture hook
  const { captureImage, generatingRef } = useShareImageCapture({
    onError: (error) => {
      toast.error(`Failed to generate image: ${error.message || 'Unknown error'}`);
    },
  });

  // Filter auditions by badge's audition_ids
  const filteredAuditions = useMemo(() => {
    if (!badge || !badge?.earned || !badge?.audition_ids?.length || !auditions?.length) {
      return [];
    }
    return auditions.filter((audition) => 
      badge.audition_ids.includes(audition.id)
    );
  }, [badge, auditions]);

  // Fetch auditions if not already loaded
  useEffect(() => {
    if (open && badge?.earned && badge?.audition_ids?.length > 0) {
      if (!auditions || auditions.length === 0) {
        dispatch(getActorAuditions({}));
      }
    }
  }, [open, badge, dispatch, auditions]);

  // Reset share state when modal closes and cleanup blob URLs
  useEffect(() => {
    if (!open) {
      setGeneratingImage(false);
      setImageType(null);
      // Cleanup blob URL to prevent memory leaks
      setPreviewImage((currentPreview) => {
        if (currentPreview && currentPreview.startsWith('blob:')) {
          URL.revokeObjectURL(currentPreview);
        }
        return null;
      });
      setShowImagePreview(false);
    }
  }, [open]);
  
  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  const calculateProgress = () => {
    if (!badge || badge?.earned) return null;
    
    const progressMap = {
      five_auditions: { current: totalAuditions, target: 5 },
      ten_auditions: { current: totalAuditions, target: 10 },
      twenty_five_auditions: { current: totalAuditions, target: 25 },
      first_callback: { 
        current: totalCallbacks, 
        target: 1 
      },
    };

    return progressMap[badge?.id] || { current: 0, target: 1 };
  };

  const progress = calculateProgress();
  const progressPercentage = progress 
    ? Math.min((progress.current / progress.target) * 100, 100)
    : 0;

  // Get the audition that unlocked the badge and latest date
  const getUnlockInfo = () => {
    if (!badge || !badge?.earned || !filteredAuditions.length) return null;

    let unlockingAudition = null;
    const badgeType = badge?.id;
    
    if (badgeType === 'five_auditions') {
      unlockingAudition = filteredAuditions[4] || filteredAuditions[filteredAuditions.length - 1];
    } else if (badgeType === 'ten_auditions') {
      unlockingAudition = filteredAuditions[9] || filteredAuditions[filteredAuditions.length - 1];
    } else if (badgeType === 'twenty_five_auditions') {
      unlockingAudition = filteredAuditions[24] || filteredAuditions[filteredAuditions.length - 1];
    } else if (badgeType === 'first_audition') {
      unlockingAudition = filteredAuditions[0];
    } else if (badgeType === 'first_callback') {
      unlockingAudition = filteredAuditions.find(a => a.audition_status === 'callback') || filteredAuditions[0];
    } else if (badgeType === 'first_booking') {
      unlockingAudition = filteredAuditions.find(a => a.audition_status === 'booked') || filteredAuditions[0];
    } else {
      unlockingAudition = filteredAuditions[filteredAuditions.length - 1];
    }

    // Get the latest date from all related auditions
    const dates = filteredAuditions
      .map(a => a.audition_date ? new Date(a.audition_date) : null)
      .filter(Boolean)
      .sort((a, b) => b - a);
    
    const latestDate = dates.length > 0 ? dates[0] : null;
    
    const unlockDate = badge.earned_date 
      ? dayjs(badge.earned_date).format('MMM D, YYYY')
      : latestDate
      ? dayjs(latestDate).format('MMM D, YYYY')
      : unlockingAudition?.audition_date 
      ? dayjs(unlockingAudition.audition_date).format('MMM D, YYYY')
      : 'Recently';
    
    return {
      project: unlockingAudition?.project_name || unlockingAudition?.title || 'Unknown Project',
      date: unlockDate,
    };
  };

  const unlockInfo = getUnlockInfo();

  const handleDownloadImage = async () => {
    if (!previewImage) return;
    
    try {
      // Fetch the blob URL
      const response = await fetch(previewImage);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const platformName = imageType === 'instagram' ? 'instagram-story' : 'linkedin';
      link.download = `${badge?.name?.replace(/\s+/g, '-') || 'badge'}-${platformName}-${Date.now()}.png`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      const platformLabel = imageType === 'instagram' ? 'Instagram Story' : 'LinkedIn';
      toast.success(`${platformLabel} image downloaded successfully!`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image. Please try again.');
    }
  };

  const handleBackToBadge = () => {
    setShowImagePreview(false);
    setGeneratingImage(false);
    if (previewImage) {
      if (previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
      setPreviewImage(null);
    }
    setImageType(null);
  };

  const handleShareImage = async () => {
    if (!previewImage) return;
    
    try {
      // Convert blob URL to File for Web Share API
      const response = await fetch(previewImage);
      const blob = await response.blob();
      const file = new File([blob], `${badge.name.replace(/\s+/g, '-')}-${imageType === 'instagram' ? 'Instagram-Story' : 'LinkedIn'}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Check out my achievement: ${badge.name}`,
        });
        toast.success('Image shared successfully!');
      } else {
        toast.info('Please use the Download button to save the image');
      }
    } catch (error) {
      console.error('Failed to share image:', error);
      toast.info('Please use the Download button to save the image');
    }
  };

  const handleGenerateImage = async (type) => {
    // Prevent concurrent captures
    if (generatingRef.current) {
      return;
    }

    // Select correct template ref
    const templateRef = type === 'instagram' ? instagramTemplateRef : linkedinTemplateRef;
    
    if (!templateRef.current || !badge) {
      toast.error('Image template not ready. Please try again.');
      return;
    }

    // Set loading state immediately
    setPreviewImage(null);
    setImageType(type);
    setGeneratingImage(true);
    setShowImagePreview(true);

    try {
      // Dimensions for each platform
      const dimensions = {
        instagram: { width: 1080, height: 1920, scale: 2 },
        linkedin: { width: 1200, height: 627, scale: 2 },
      };

      // Capture image using hook
      const imageUrl = await captureImage(templateRef.current, dimensions[type]);

      // Update state with captured image
      setPreviewImage(imageUrl);
      setGeneratingImage(false);
    } catch (error) {
      // Error already handled by hook's onError callback
      setShowImagePreview(false);
      setPreviewImage(null);
      setGeneratingImage(false);
      setImageType(null);
    }
  };

  if (!badge) {
    return null;
  }

  return (
    <>
      <CustomModal
        open={open}
        close={onClose}
        title={(showImagePreview || generatingImage)
          ? (imageType === 'instagram' ? 'Instagram Story' : 'LinkedIn Post')
          : (badge?.name || 'Badge Details')
        }
        mainBoxClassName={(showImagePreview || generatingImage)
          ? (imageType === 'linkedin' ? "!max-w-5xl !min-w-[700px]" : "!max-w-md !min-w-[450px]")
          : "!max-w-lg !min-w-[500px]"
        }
        childClassName="!max-w-full !min-w-0 !overflow-visible !max-h-[85vh] !overflow-y-auto"
        noFooter
      >
        {generatingImage ? (
          // Loading View - inside modal content area
          <div className="py-8 px-6">
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <CircularProgress size={50} className="!text-primary mb-5" />
              <p className="text-sm text-gray-500 font-medium">Generating your image...</p>
            </div>
          </div>
        ) : showImagePreview ? (
          // Image Preview View - Professional International Design
          <div className="py-6 px-6">
            {previewImage ? (
              <div className="space-y-6">
                {/* Image Container - Centered with proper aspect ratio, no cutting */}
                <div className="w-full flex justify-center items-center bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div 
                    className="w-full flex justify-center items-center"
                    style={{
                      aspectRatio: imageType === 'instagram' ? '9/16' : '1200/627',
                      maxHeight: imageType === 'linkedin' ? 'calc(85vh - 200px)' : 'calc(85vh - 200px)',
                      maxWidth: '100%',
                    }}
                  >
                    <img
                      src={previewImage}
                      alt={`Generated ${imageType === 'instagram' ? 'Instagram Story' : 'LinkedIn'} share image`}
                      className="w-full h-full object-contain rounded-lg"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                      onError={() => {
                        toast.error('Failed to display image. Please try again.');
                        handleBackToBadge();
                      }}
                    />
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                  <CustomButton variant="outlined" onClick={handleBackToBadge}>
                    Back
                  </CustomButton>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <CustomButton variant="outlined" onClick={handleShareImage}>
                      Share
                    </CustomButton>
                  )}
                  <CustomButton onClick={handleDownloadImage}>
                    Download
                  </CustomButton>
                </div>
              </div>
            ) : (
              // Error state
              <div className="flex flex-col items-center justify-center min-h-[350px]">
                <p className="text-red-600 text-sm font-medium mb-5">Failed to generate image. Please try again.</p>
                <CustomButton variant="outlined" onClick={handleBackToBadge}>
                  Back
                </CustomButton>
              </div>
            )}
          </div>
        ) : badge?.earned ? (
          // Earned Badge View - Professional International Design
          <div className="py-8 px-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <CircularProgress size={40} className="!text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {unlockInfo && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">🎉</span>
                      <h3 className="text-base font-semibold text-gray-900">
                        Achievement Unlocked!
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <span className="font-medium">Earned by completing:</span>{' '}
                      <span className="text-primary font-semibold">
                        {unlockInfo.project}
                      </span>
                      {' on '}
                      <span className="font-medium">{unlockInfo.date}</span>
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                  <CustomButton variant="outlined" onClick={onClose}>
                    Close
                  </CustomButton>
                  <CustomButton
                    onClick={() => handleGenerateImage('instagram')}
                    loading={generatingImage && imageType === 'instagram'}
                    disabled={generatingImage}
                  >
                    Instagram Story
                  </CustomButton>
                  <CustomButton
                    onClick={() => handleGenerateImage('linkedin')}
                    loading={generatingImage && imageType === 'linkedin'}
                    disabled={generatingImage}
                  >
                    LinkedIn
                  </CustomButton>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Locked Badge View - Professional International Design
          <div className="py-8 px-6">
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                  <span className="text-3xl">🔒</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Keep Going!
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed break-words px-2">
                  {badge?.description}
                </p>
              </div>

              {progress && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Progress
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {progress.current} / {progress.target}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    {progress.target - progress.current} more to unlock this badge
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-5 border-t border-gray-200">
                <CustomButton variant="outlined" onClick={onClose}>
                  Close
                </CustomButton>
              </div>
            </div>
          </div>
        )}
      </CustomModal>

      {/* Hidden templates - always mounted when badge is earned */}
      {badge?.earned && unlockInfo && (
        <>
          <InstagramShareTemplate
            badge={badge}
            unlockInfo={unlockInfo}
            templateRef={instagramTemplateRef}
          />
          <LinkedInShareTemplate
            badge={badge}
            unlockInfo={unlockInfo}
            templateRef={linkedinTemplateRef}
          />
        </>
      )}
    </>
  );
};
