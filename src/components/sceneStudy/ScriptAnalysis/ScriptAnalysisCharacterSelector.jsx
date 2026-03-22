// Local import
import { useState } from 'react';
import { updateScriptMetadata } from '../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';
import { CustomButton, SelectDropdown } from '../../Shared';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { EditIcon3 } from '../../../assets/icons';

export const ScriptAnalysisCharacterSelector = ({
  scriptData,
  setScriptData,
  selectedCharacter,
  setSelectedCharacter,
  allowEditMetadata = true,
}) => {
  const { title, scene, characterOptions } = scriptData;
  const { analysisLoading } = useSelector((state) => state.sceneStudyScripts);
  console.log('title and secne', analysisLoading);
  const { scriptId } = useParams();
  const dispatch = useDispatch();
  const { toast } = useSnackbar();
  const handleChange = (e) => {
    setSelectedCharacter((prev) => ({
      ...prev,
      character: e?.target?.value,
    }));
  };

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      const result = await dispatch(
        updateScriptMetadata({
          scriptId: scriptId,
          payload: {
            title: formData?.title.trim(),
            description: formData?.scene,
          },
        })
      );

      if (result?.meta?.requestStatus === 'fulfilled') {
        toast.success('Script metadata updated successfully');
        setScriptData((prev) => ({
          ...prev,
          title: formData.title,
          scene: formData.scene ? formData.scene : null,
        }));
        setIsEditing(false);
      } else {
        toast.error(result?.payload || 'Failed to update script metadata');
      }
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Something went wrong while updating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex justify-between items-center flex-wrap py-4 px-4 sm:px-6 w-full gap-4 sm:gap-6 bg-white rounded-lg shadow-sm'>
      <div className='flex-1 min-w-0'>
        {isEditing && allowEditMetadata ? (
          <div className='flex flex-col gap-1'>
            <input
              type='text'
              name='title'
              value={formData?.title || title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className='text-xl sm:text-2xl font-bold text-gray-900 border-b-1 border-primary focus:outline-none focus:border-primary-dark transition-all bg-transparent w-fit py-2'
              placeholder='Enter title'
              autoFocus
            />
            <input
              type='text'
              name='scene'
              value={formData?.scene || scene}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  scene: e.target.value,
                })
              }
              className='text-sm text-gray-600 border-b-1 border-primary focus:outline-none focus:border-primary-dark transition-all bg-transparent w-fit py-2'
              placeholder='Add description'
            />
            <div className='mt-[10px] flex items-center gap-4'>
              <CustomButton
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ title, scene });
                }}
                variant='outlined'
                className={'!min-w-15 !p-2 !h-[27px]'}
                disabled={loading}
              >
                Cancel
              </CustomButton>
              <CustomButton
                onClick={handleSave}
                disabled={loading}
                className={'!min-w-15 !p-2 !h-[27.5px]'}
              >
                {loading ? 'Saving...' : 'Save'}
              </CustomButton>
            </div>
          </div>
        ) : (
          <div className='flex  gap-4'>
            <div>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>
                {title}
              </h1>
              {scene && <p className='text-sm text-gray-500 mt-1'>{scene}</p>}
            </div>
            {allowEditMetadata && (title || scene) && (
              <button
                onClick={() => setIsEditing(true)}
                className='text-gray-500 cursor-pointer h-fit hover:text-primary transition-all p-2 rounded-full hover:bg-primary/10'
                title='Edit title and mb-auto scene'
              >
                <EditIcon3 />
              </button>
            )}
          </div>
        )}
      </div>

      {!isEditing && (
        <SelectDropdown
          name='character'
          placeholder='Select Character'
          value={selectedCharacter?.character}
          options={characterOptions}
          onChange={handleChange}
          className='w-full sm:w-48 h-11 border-primary rounded-md focus:ring-2 focus:ring-primary focus:border-primary-dark text-gray-900 bg-gray-50'
        >
          {characterOptions.map((option) => (
            <option key={option?.value} value={option?.value}>
              {option?.label}
            </option>
          ))}
        </SelectDropdown>
      )}
    </div>
  );
};

