import { useNavigate } from 'react-router-dom';
import ScriptUploadAndListing from '../SceneStudyAnalysis/ScriptUploadAndListing';

const AiScenePartner = () => {
  const navigate = useNavigate();

  const handleStartRehearsal = (script) => {
    if (!script?.id) return;
    navigate(`/scene-study/collaboration/ai-scene-partner/${script.id}`, {
      state: { scriptId: script.id, script },
    });
  };

  return (
    <div className='m-[10px] flex flex-col gap-[10px]'>
      <ScriptUploadAndListing
        variant='ai-partner'
        onStartRehearsal={handleStartRehearsal}
        showUpload={false}
      />
    </div>
  );
};

export default AiScenePartner;

