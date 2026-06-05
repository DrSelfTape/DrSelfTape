// Library imports
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// Local imports
import {
  CustomTabPanel,
  Textarea,
  CustomButton,
} from '../../../Shared';
import {
  createNotes,
  updateNotes,
  deleteNotes,
  getNotes,
} from '../../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';
import { useSnackbar } from '../../../../hooks/useSnackbar';

export const ScriptAnalysisNotesTab = ({ value, index, sceneAnalysisData }) => {
  const dispatch = useDispatch();
  const { toast } = useSnackbar();

  const { notes, notesLoading, notesListingLoading, notesDeleteLoading } =
    useSelector((state) => state.sceneStudyScripts);

  const [isEditing, setIsEditing] = useState(false);
  const [localNote, setLocalNote] = useState(''); // temp input for editing/adding

  // Sync localNote with Redux notes when notes change
  useEffect(() => {
    setLocalNote(notes || '');
    setIsEditing(!notes); // auto-edit if no note exists
  }, [notes]);

  const refreshNotes = async () => {
    if (!sceneAnalysisData?.analysisID) return;
    try {
      const result = await dispatch(getNotes(sceneAnalysisData.analysisID));
      if (result?.meta?.requestStatus === 'rejected') {
        toast.error(result?.payload || 'Could not load notes.');
      }
    } catch (err) {
      console.error('Failed to refresh notes:', err);
      toast.error('Could not load notes.');
    }
  };

  const handleSaveNote = async () => {
    if (!sceneAnalysisData?.analysisID) return;
    try {
      const payload = { notes: localNote };
      const action = notes
        ? updateNotes({ analysisId: sceneAnalysisData.analysisID, payload })
        : createNotes({ analysisId: sceneAnalysisData.analysisID, payload });

      const result = await dispatch(action);
      if (result?.meta?.requestStatus === 'fulfilled') {
        toast.success(`Note ${notes ? 'updated' : 'saved'}`);
        setIsEditing(false);
        await refreshNotes(); // refresh after save
      } else {
        toast.error(
          result?.payload || `Failed to ${notes ? 'update' : 'save'} note`
        );
      }
    } catch (err) {
      console.error('Save note failed:', err);
      toast.error(
        `Something went wrong while ${notes ? 'updating' : 'saving'} note`
      );
    }
  };

  const handleDeleteNote = async () => {
    if (!sceneAnalysisData?.analysisID) return;
    try {
      const result = await dispatch(deleteNotes(sceneAnalysisData.analysisID));
      if (result?.meta?.requestStatus === 'fulfilled') {
        toast.success('Note deleted');
        setLocalNote('');
        setIsEditing(true); // go to add stage immediately
        await refreshNotes(); // refresh after delete
      } else {
        toast.error(result?.payload || 'Failed to delete note');
      }
    } catch (err) {
      console.error('Delete note failed:', err);
      toast.error('Something went wrong while deleting note');
    }
  };

  return (
    <CustomTabPanel value={value} index={index}>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
        {/* Header */}
        <div className='bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center'>
          <h3 className='text-sm font-semibold text-gray-800 select-none'>
            Note
          </h3>

          {notes && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className='text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer transition-colors'
            >
              Edit
            </button>
          )}
        </div>

        {/* Body */}
        {notesListingLoading ? (
          <p className='text-sm text-gray-500 text-center py-6'>
            Loading notes...
          </p>
        ) : isEditing ? (
          <div className='mx-4 mt-4'>
            <Textarea
              name='note'
              placeholder='Add your personal notes about this scene here...'
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              className='!text-sm !rounded-none !border-0 focus:!ring-0 focus:!border-0 min-h-[120px]'
            />
          </div>
        ) : (
          <div className='text-sm text-gray-700 whitespace-pre-wrap min-h-[100px] p-4 select-none'>
            {notes}
          </div>
        )}

        {/* Footer */}
        {isEditing && (
          <div className='flex justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50'>
            {notes && (
              <CustomButton
                isDelete
                onClick={handleDeleteNote}
                disabled={notesDeleteLoading}
                loading={notesDeleteLoading}
                variant='outlined'
                className='!h-7 !text-xs !px-3'
                CircularProgressSize={14}
              >
                Delete
              </CustomButton>
            )}
            <CustomButton
              onClick={handleSaveNote}
              disabled={notesLoading || !localNote.trim()}
              loading={notesLoading}
              className='!h-7 !text-xs !px-3'
              CircularProgressSize={14}
            >
              {notes ? 'Update' : 'Save'}
            </CustomButton>
          </div>
        )}
      </div>
    </CustomTabPanel>
  );
};

