import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  CustomButton,
  CustomPopover,
  Textarea,
} from '../../../Shared';
import {
  createLineAnnotation,
  deleteLineAnnotation,
  getLineAnnotation,
  updateLineAnnotation,
} from '../../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';
import { PenNotebookIcon } from '../../../../assets/icons';

export const LineAnnotation = ({ versionId, lineId }) => {
  const dispatch = useDispatch();
  const {
    annotations,
    annotationLoading,
    annotationDeleteLoading,
    annotationListingLoading,
  } = useSelector((state) => state.sceneStudyScripts);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [note, setNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Load annotation when opened
  useEffect(() => {
    if (isPopoverOpen && versionId && lineId) {
      dispatch(getLineAnnotation({ versionId, lineId }));
    }
  }, [isPopoverOpen, versionId, lineId, dispatch]);

  const annotation = annotations[lineId];

  useEffect(() => {
    setNote(annotation?.note || '');
    setIsEditing(false);
  }, [annotation]);

  // Handle Create or Update
  const handleSaveAnnotation = async () => {
    if (!versionId || !lineId) return;

    const payload = { note };

    try {
      if (annotation) {
        await dispatch(updateLineAnnotation({ versionId, lineId, payload }));
        console.log('Annotation updated');
      } else {
        await dispatch(createLineAnnotation({ versionId, lineId, payload }));
        console.log('Annotation created');
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save annotation:', error);
    }
  };

  // Handle Delete
  const handleDeleteAnnotation = async () => {
    if (!annotation) return;

    try {
      await dispatch(deleteLineAnnotation({ versionId, lineId }));
      setNote('');
      console.log('Annotation deleted');
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  const handleOpenChange = (open) => setIsPopoverOpen(open);

  return (
    <CustomPopover
      trigger={<PenNotebookIcon className='cursor-pointer text-primary' />}
      open={isPopoverOpen}
      onOpenChange={handleOpenChange}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <div className='w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden'>
        {annotationListingLoading ? (
          <div className='p-6 text-center text-sm text-gray-500'>
            Loading annotation...
          </div>
        ) : (
          <>
            {/* Header */}
            <div className='bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center'>
              <h3 className='text-sm font-semibold text-gray-800'>
                {annotation ? 'Annotation' : 'Add Annotation'}
              </h3>
              {annotation && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className='text-xs text-blue-600 font-medium hover:underline'
                >
                  Edit
                </button>
              )}
            </div>

            {/* Body */}
            <div>
              {/* If annotation exists and not editing, show note text */}
              {annotation && !isEditing ? (
                <div className='p-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[100px]'>
                  {annotation.note}
                </div>
              ) : (
                <Textarea
                  placeholder='Write...'
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className='!p-3 !text-sm !rounded-xl !border-gray-200 focus:!border-blue-500 focus:!ring-2 focus:!ring-blue-100 transition-all duration-200 min-h-[100px] mb-4'
                />
              )}

              {/* Action Buttons */}
              {(!annotation || isEditing) && (
                <div className='flex justify-end gap-2 p-2 border-t border-gray-100'>
                  {annotation && (
                    <CustomButton
                      isDelete
                      onClick={handleDeleteAnnotation}
                      disabled={annotationDeleteLoading}
                      loading={annotationDeleteLoading}
                      variant='outlined'
                      className='!h-6 !text-[12px] !p-0'
                      CircularProgressSize={14}
                    >
                      Delete
                    </CustomButton>
                  )}
                  <CustomButton
                    onClick={handleSaveAnnotation}
                    disabled={annotationLoading || !note}
                    loading={annotationLoading}
                    className='!h-6 !text-[12px] !p-0'
                    CircularProgressSize={14}
                  >
                    {annotation ? 'Update' : 'Save'}
                  </CustomButton>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </CustomPopover>
  );
};

