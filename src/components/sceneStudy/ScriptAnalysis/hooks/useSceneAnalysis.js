import { useEffect, useState } from 'react';
import {
  getAudioComposition,
  getNotes,
  getSceneAnalysis,
  getScriptAnalysis,
  getCoachScriptScenes,
} from '../../../../redux/features/sceneStudyScripts/sceneStudyScriptsSlice';
import { useParams } from 'react-router-dom';

/**
 * Shared hook for fetching script + scene analysis data.
 *
 * - Actor mode:
 *   - Uses /scene-study/version/:versionId/scene/
 *   - Also loads scene-analysis JSON + notes.
 * - Coach mode:
 *   - Uses /scene-study/coach/scripts/:scriptId/scenes/
 *   - Still loads audio composition so coach can hear any existing actor audio.
 *   - Skips scene-analysis + notes by default.
 */
export const useSceneAnalysis = ({
  dispatch,
  navigate,
  mode = 'actor',
  redirectPath,
  enableSceneAnalysis = true,
  enableNotes = true,
}) => {
  const [sceneAnalysisData, setSceneAnalysisData] = useState([]);
  const { scriptId } = useParams();

  const effectiveRedirectPath =
    redirectPath || (mode === 'coach' ? '/collaboration' : '/scene-study/analysis');

  // Fetch script / scenes + audio when scriptId changes
  useEffect(() => {
    if (!scriptId) {
      navigate(effectiveRedirectPath);
      return;
    }

    if (mode === 'coach') {
      // Coach: call coach-only endpoint for scenes, but reuse same state shape.
      // IMPORTANT: we do NOT hit the audio composition API here. Coach view
      // should rely only on actor-generated audio already attached to lines.
      dispatch(getCoachScriptScenes(scriptId));
      // Optionally load scene-level analysis JSON if explicitly enabled.
      if (enableSceneAnalysis) {
        getSceneAnaylsisData(scriptId);
      }
    } else {
      // Actor: original behavior (scripts + composition + analysis + notes)
      dispatch(getScriptAnalysis(scriptId));
      if (enableSceneAnalysis) {
        getSceneAnaylsisData(scriptId);
      }
      dispatch(getAudioComposition(scriptId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, scriptId, mode, effectiveRedirectPath, enableSceneAnalysis]);

  // Fetch notes (actor / analysis-only)
  useEffect(() => {
    if (
      mode === 'actor' &&
      enableNotes &&
      scriptId &&
      sceneAnalysisData?.analysisID
    ) {
      dispatch(getNotes(sceneAnalysisData?.analysisID));
    }
  }, [dispatch, scriptId, sceneAnalysisData?.analysisID, mode, enableNotes]);

  const getSceneAnaylsisData = async (id) => {
    const versionOrScriptId = id || scriptId;
    if (!versionOrScriptId) return;

    const data = await dispatch(getSceneAnalysis(versionOrScriptId));
    if (data?.meta?.requestStatus === 'fulfilled') {
      const res = data?.payload;
      const sceneObjectives =
        res?.analysis?.analysis_json?.scene_objectives?.map((item) => ({
          sceneObject: item?.objective || '',
          sceneId: item?.scene_id || '0',
          ...item,
        }));
      const emotionalBeats =
        res?.analysis?.analysis_json?.emotional_beats[0]?.beats;
      const subtextTransitions =
        res?.analysis?.analysis_json?.subtext_transitions[0]?.notes;
      const characterMotivation =
        res?.analysis?.analysis_json?.character_motivation?.map((item) => ({
          characterName: item?.character || '',
          motivation: item?.motivation,
        }));
      const toneEnergy = res?.analysis?.analysis_json?.tone_energy?.map(
        (item) => ({
          ...item,
          tone: item?.overall_tone || '',
          energyMap: item?.energy_map,
        })
      );
      const sceneAnalysis = {
        analysisID: res?.analysis?.id,
        sceneObjectives,
        emotionalBeats,
        subtextTransitions,
        characterMotivation,
        toneEnergy,
      };
      setSceneAnalysisData({ ...sceneAnalysis });
    }
  };

  return {
    sceneAnalysisData,
    getSceneAnaylsisData,
  };
};

