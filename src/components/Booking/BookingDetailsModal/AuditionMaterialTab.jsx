import React from 'react';
import { FilePicker } from '../../../components/Shared';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CrossIcon, DeleteIcon } from '../../../assets/icons';

const AuditionMaterialsTab = ({
  rowData,
  formData,
  setFormData,
  isEditing,
  setIsEditing,
  showDeleteConfirm,
  setShowDeleteConfirm,
  materialToDelete,
  setMaterialToDelete,
  handleSave,
  handleDelete,
  loading,
  materials,
  className,
}) => {
  const handleAddNew = (e) => {
    showDeleteConfirm && setShowDeleteConfirm(false);
    const file = e.target.files[0];
    if (file && !formData.materials.some((m) => !m.id)) {
      setFormData((prev) => ({
        ...prev,
        materials: [
          ...prev.materials,
          {
            file,
            file_name: file.name,
            file_url: URL.createObjectURL(file),
            notes: null,
            material_type: 'self_tape',
            material_status: 'draft',
            version_number: 1,
            is_primary: prev.materials.length === 0,
            view_count: 0,
            last_viewed_at: null,
          },
        ],
      }));
    }
  };

  const hasPending = materials.some((m) => !m.id);
  return (
    <div className='flex flex-col px-2'>
      <div className='rounded-xl bg-white border border-style flex flex-col h-full'>
        {/* scrollable materials list */}
        <div
          className={`flex-1 ${
            isEditing && 'max-h-[calc(100vh-430px)]'
          } overflow-y-auto space-y-2  p-4 ${className}`}
        >
          {materials.length === 0 ? (
            <div className='text-center text-secondary'>
              No materials added yet.
            </div>
          ) : (
            materials.map((m, index) => {
              const isBeingDeleted =
                showDeleteConfirm && materialToDelete?.id === m.id;

              return (
                <>
                  <div
                    key={index}
                    className={`flex items-center justify-between w-full border rounded-lg px-3 py-2 transition-colors ${
                      isBeingDeleted
                        ? 'border-[var(--color-danger)] bg-red-50'
                        : 'border-style hover:bg-gray-50'
                    }`}
                  >
                    <div className={`${isEditing ? 'w-[90%]' : 'w-[100%]'}`}>
                      <FilePicker
                        name={`material-${index}`}
                        title={m.file_name}
                        url={m.file}
                        view={true}
                        disabled={true}
                        onChange={() => {}}
                        placeholder={m.file_name}
                        className='edit-booking-style flex-1 !w-full'
                      />
                    </div>
                    {isEditing && (
                      <DeleteIcon
                        className={`ml-3 w-5 h-5 transition-colors mt-5 ${
                          isBeingDeleted
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-[var(--color-danger)] cursor-pointer hover:text-red-600'
                        }`}
                        onClick={
                          isBeingDeleted
                            ? undefined
                            : () => {
                                setMaterialToDelete(m);
                                setShowDeleteConfirm(true);
                              }
                        }
                      />
                    )}
                  </div>
                </>
              );
            })
          )}
        </div>

        {/* sticky add new at bottom */}
        {isEditing && (
          <div className='mt-4 border-t border-style  p-4'>
            {hasPending ? (
              <p className='text-secondary text-sm'>
                Pending material added, save to confirm.
              </p>
            ) : (
              <FilePicker
                title='Add New Material'
                name='new_material'
                onChange={handleAddNew}
                disabled={loading}
                placeholder='Choose a file to add'
                accept='.jpg,.jpeg,.png,.pdf,.mp4,.webm,.avi'
                className='
              edit-booking-style !w-full
              !border-2 !border-dashed border-style 
              !rounded-lg !bg-gray-50 
              !hover:bg-gray-100 !hover:border-[var(--color-primary)] 
              !text-secondary text-sm font-medium 
              !transition-all cursor-pointer
            '
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditionMaterialsTab;
