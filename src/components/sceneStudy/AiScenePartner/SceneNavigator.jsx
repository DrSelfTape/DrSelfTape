import { useMemo, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, RotateCcw, CheckCircle2 } from 'lucide-react';
import SceneCompleteBadge from '../../SceneCompleteBadge';

/**
 * SceneNavigator
 * ─────────────────────────────────────────────────────────────
 * Shows:
 *  • How many scenes the script has
 *  • Which scene you're currently in (with title)
 *  • Per-scene progress (lines completed / total)
 *  • Per-scene page estimate
 *  • "Restart Scene" button — jumps back to first line of current scene
 *  • "Next Scene" button — advances to first line of next scene (when ready)
 *  • "Prev Scene" button — jumps back to first line of previous scene
 */
const SceneNavigator = ({
  scriptLines = [],
  currentLineIndex = 0,
  completedLines = new Set(),
  sessionStarted = false,
  audioPlayer = null,
  setCurrentLineIndex,
  stopAllPlayback,
  scrollToLine,
}) => {
  // ── Build scene map ──────────────────────────────────────────
  const scenes = useMemo(() => {
    const map = new Map(); // sceneId → { sceneNumber, sceneTitle, startIndex, endIndex, lineCount }

    scriptLines.forEach((line, index) => {
      const sid = line.sceneId ?? 'default';
      if (!map.has(sid)) {
        map.set(sid, {
          sceneId: sid,
          sceneNumber: line.sceneNumber ?? 1,
          sceneTitle: line.sceneTitle || `Scene ${line.sceneNumber ?? 1}`,
          startIndex: index,
          endIndex: index,
          lineCount: 0,
        });
      }
      const scene = map.get(sid);
      scene.endIndex = index;
      scene.lineCount++;
    });

    return Array.from(map.values()).sort((a, b) => a.sceneNumber - b.sceneNumber);
  }, [scriptLines]);

  // ── Which scene is the user currently in ────────────────────
  const currentSceneIndex = useMemo(() => {
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (currentLineIndex >= scenes[i].startIndex) return i;
    }
    return 0;
  }, [scenes, currentLineIndex]);

  const currentScene = scenes[currentSceneIndex] || null;
  const totalScenes = scenes.length;

  // ── Per-scene completion ─────────────────────────────────────
  const sceneCompletedCount = useMemo(() => {
    if (!currentScene) return 0;
    let count = 0;
    for (let i = currentScene.startIndex; i <= currentScene.endIndex; i++) {
      if (completedLines.has(i)) count++;
    }
    return count;
  }, [currentScene, completedLines]);

  const sceneProgress = currentScene
    ? Math.round((sceneCompletedCount / currentScene.lineCount) * 100)
    : 0;

  // ── Page estimate (approx 1 page = 55 lines in a script) ────
  const LINES_PER_PAGE = 55;
  const currentPage = currentScene
    ? Math.max(1, Math.ceil((currentLineIndex - currentScene.startIndex + 1) / LINES_PER_PAGE))
    : 1;
  const totalPages = currentScene
    ? Math.max(1, Math.ceil(currentScene.lineCount / LINES_PER_PAGE))
    : 1;

  const sceneComplete = sceneProgress === 100;
  const isLastScene = currentSceneIndex === totalScenes - 1;
  const isFirstScene = currentSceneIndex === 0;

  // ── Navigation helpers ───────────────────────────────────────
  const goToLine = (lineIndex) => {
    if (audioPlayer?.stopPlayback) audioPlayer.stopPlayback();
    else stopAllPlayback?.();
    setCurrentLineIndex(lineIndex);
    setTimeout(() => scrollToLine?.(lineIndex), 50);
  };

  const handleRestartScene = () => goToLine(currentScene.startIndex);
  const handlePrevScene = () => {
    if (isFirstScene) return;
    goToLine(scenes[currentSceneIndex - 1].startIndex);
  };
  const handleNextScene = () => {
    if (isLastScene) return;
    goToLine(scenes[currentSceneIndex + 1].startIndex);
  };

  // ── Badge celebration trigger ────────────────────────────────
  const [showBadge, setShowBadge] = useState(false);
  const celebratedScenes = useRef(new Set()); // track which scenes already celebrated

  useEffect(() => {
    if (!currentScene || !sessionStarted) return;
    const sid = currentScene.sceneId;
    if (sceneProgress === 100 && !celebratedScenes.current.has(sid)) {
      celebratedScenes.current.add(sid);
      // Small delay so final line animation settles first
      const t = setTimeout(() => setShowBadge(true), 600);
      return () => clearTimeout(t);
    }
  }, [sceneProgress, currentScene, sessionStarted]);

  if (!currentScene || totalScenes === 0) return null;

  return (
    <>
    <div
      className="rounded-xl border px-4 py-3 mb-3"
      style={{
        background: '#0f0f1a',
        borderColor: sceneComplete ? 'rgba(255, 130, 128,0.4)' : '#1E1E1E',
        boxShadow: sceneComplete ? '0 0 20px rgba(255, 130, 128,0.1)' : 'none',
      }}
    >
      {/* Top row: scene count + title */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookOpen size={14} style={{ color: '#FF8280' }} />
          <span className="text-xs font-semibold" style={{ color: '#FF8280' }}>
            Scene {currentScene.sceneNumber} of {totalScenes}
          </span>
          {sceneComplete && (
            <CheckCircle2 size={14} style={{ color: '#22C55E' }} />
          )}
        </div>
        <span className="text-xs" style={{ color: '#666666' }}>
          Page {currentPage}{totalPages > 1 ? ` / ${totalPages}` : ''}
        </span>
      </div>

      {/* Scene title */}
      <p className="text-sm font-semibold mb-2 truncate" style={{ color: '#FFFFFF' }}>
        {currentScene.sceneTitle}
      </p>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 rounded-full h-1.5" style={{ background: '#1E1E1E' }}>
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${sceneProgress}%`,
              background: sceneComplete
                ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                : 'linear-gradient(135deg, #D4A85F, #7A5A18)',
            }}
          />
        </div>
        <span className="text-xs font-semibold shrink-0" style={{ color: sceneComplete ? '#22C55E' : '#999999' }}>
          {sceneProgress}%
        </span>
      </div>

      {/* Line count */}
      <p className="text-xs mb-3" style={{ color: '#666666' }}>
        {sceneCompletedCount} of {currentScene.lineCount} lines completed
      </p>

      {/* Scene dot indicator */}
      {totalScenes > 1 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {scenes.map((sc, i) => {
            const isActive = i === currentSceneIndex;
            const scDone = (() => {
              let c = 0;
              for (let j = sc.startIndex; j <= sc.endIndex; j++) {
                if (completedLines.has(j)) c++;
              }
              return c === sc.lineCount && sc.lineCount > 0;
            })();
            return (
              <button
                key={sc.sceneId}
                onClick={() => goToLine(sc.startIndex)}
                title={`Scene ${sc.sceneNumber}: ${sc.sceneTitle}`}
                className="transition-all"
                style={{
                  width: isActive ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: scDone ? '#22C55E' : isActive ? '#FF8280' : '#2A2A2A',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-2">
        {/* Restart scene */}
        <button
          onClick={handleRestartScene}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#999999' }}
        >
          <RotateCcw size={12} />
          Restart Scene
        </button>

        {/* Prev scene */}
        {!isFirstScene && (
          <button
            onClick={handlePrevScene}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#999999' }}
          >
            <ChevronLeft size={12} />
            Prev Scene
          </button>
        )}

        {/* Next scene */}
        {!isLastScene && (
          <button
            onClick={handleNextScene}
            disabled={!sessionStarted}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-auto disabled:opacity-40"
            style={{
              background: sceneComplete
                ? 'linear-gradient(135deg, #D4A85F, #7A5A18)'
                : '#1A1A1A',
              border: sceneComplete ? 'none' : '1px solid #2A2A2A',
              color: sceneComplete ? '#fff' : '#666666',
              boxShadow: sceneComplete ? '0 3px 12px rgba(255, 130, 128,0.35)' : 'none',
            }}
          >
            {sceneComplete ? 'Move to Next Scene' : 'Next Scene'}
            <ChevronRight size={12} />
          </button>
        )}

        {/* All done */}
        {isLastScene && sceneComplete && (
          <div
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <CheckCircle2 size={12} />
            Script Complete!
          </div>
        )}
      </div>
    </div>

    {/* Scene complete celebration */}
    {showBadge && (
      <SceneCompleteBadge
        sceneNumber={currentScene.sceneNumber}
        sceneName={currentScene.sceneTitle}
        onDismiss={() => setShowBadge(false)}
      />
    )}
    </>
  );
};

export default SceneNavigator;
