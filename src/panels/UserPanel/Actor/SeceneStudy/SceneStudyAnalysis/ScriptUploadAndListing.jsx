import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createScript,
  getScripts,
  deleteScript,
} from '../../../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';
import { getActorAuditions } from '../../../../../redux/features/actorAuditions/actorAuditionsSlice';
import ScriptUpload from '../../../../../components/sceneStudy/ScriptUploadAndListing/ScriptUpload';
import ScriptsListing from '../../../../../components/sceneStudy/ScriptUploadAndListing/ScriptsListing';
import { useSnackbar } from '../../../../../hooks/useSnackbar';

const formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const ScriptUploadAndListing = ({
  variant = 'default',
  onStartRehearsal,
  showUpload = true,
}) => {
  const dispatch = useDispatch();
  const { scripts, listingLoading, loading, deleteLoading } = useSelector(
    (state) => state.sceneStudyScripts
  );
  const { auditions } = useSelector((state) => state.actorAuditions || { auditions: [] });

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);
  const fileInputRef = useRef(null);
  const { toast } = useSnackbar();
  
  // Fetch scripts and auditions
  // Initial fetch on mount
  useEffect(() => {
    dispatch(getScripts());
    dispatch(getActorAuditions());
  }, [dispatch]);

  useEffect(() => {
    const hasPending = scripts?.some(
      (script) => script?.latest_version?.extraction_status !== 'ready'
    );
    if (!hasPending) return;

    const interval = setInterval(() => {
      dispatch(getScripts());
    }, 5000);

    return () => clearInterval(interval);
  }, [scripts, dispatch]);

  useEffect(() => {
    if (scripts) setFiles(scripts);
  }, [scripts]);

  // --- Handlers ---
  const handleCloseDelete = () => {
    setSelectedScript(null);
    setIsDeleteModalOpen(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleFileSelect = (file) => {
    if (!file) {
      setError('No file selected');
      setSelectedFile(null);
      return;
    }
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, TXT, and DOCX files are allowed');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleView = () => {
    if (selectedFile) {
      const fileUrl = URL.createObjectURL(selectedFile);
      window.open(fileUrl, '_blank');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file to submit');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);

    const action = await dispatch(createScript(formData));
    if (action.meta.requestStatus === 'fulfilled') {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setError('');
      toast.success('Script Added');
    } else {
      setError(
        typeof action?.payload === 'string'
          ? action.payload
          : 'Failed to upload script'
      );
    }
  };

  const handleDeleteFile = async (id) => {
    const action = await dispatch(deleteScript(id));
    if (action.meta.requestStatus === 'fulfilled') {
      handleCloseDelete();
      toast.success('Script Deleted');
    }
  };

  return (
    <div className='w-full p-[10px]'>
      <div className='flex flex-col gap-4'>
        {showUpload && (
          <ScriptUpload
            fileInputRef={fileInputRef}
            selectedFile={selectedFile}
            error={error}
            onFileChange={handleFileChange}
            onClear={handleClear}
            onView={handleView}
            onSubmit={handleSubmit}
            loading={loading}
          />
        )}
        <ScriptsListing
          files={files}
          listingLoading={listingLoading}
          onDeleteFile={handleDeleteFile}
          formatFileSize={formatFileSize}
          deleteLoading={deleteLoading}
          selectedScript={selectedScript}
          setSelectedScript={setSelectedScript}
          isDeleteModalOpen={isDeleteModalOpen}
          setIsDeleteModalOpen={setIsDeleteModalOpen}
          handleCloseDelete={handleCloseDelete}
          variant={variant}
          onStartRehearsal={onStartRehearsal}
          auditions={auditions}
        />
      </div>
    </div>
  );
};

export default ScriptUploadAndListing;
