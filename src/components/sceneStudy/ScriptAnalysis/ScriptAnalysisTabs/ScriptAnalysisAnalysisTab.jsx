// Local imports
import {
  CustomTabPanel,
  CustomAccordion,
} from '../../../Shared';
import { HighlightedText } from '../ScriptAnalysisComponents/HighlightedText';

// Icons imports
import {
  BrainIcon,
  HeartIcon,
  StatisticsIcon,
  TargetIcon,
} from '../../../../assets/icons';
import { ArrowRightIcon } from '@mui/x-date-pickers';

export const ScriptAnalysisAnalysisTab = ({
  value,
  index,
  sceneAnalysisData,
  currentLineIndex,
  highlightedWordIndex,
  selectedCharacter,
}) => {
  return (
    <CustomTabPanel value={value} index={index}>
      <div className='space-y-4 max-h-fit overflow-auto'>
        <CustomAccordion
          header='Scene Objectives'
          icon={<TargetIcon className='h-4 w-4 text-[#A7ECDA]' />}
        >
          <ul className='list-disc list-inside pl-5 text-[#09090B] text-sm flex flex-col gap-1'>
            {sceneAnalysisData?.sceneObjectives?.length > 0 ? (
              sceneAnalysisData?.sceneObjectives?.map((item, index) => {
                return (
                  <li key={index}>
                    <HighlightedText
                      text={item?.objective}
                      lineIndex={-1} // Use -1 or any value that won't match currentLineIndex
                      currentLineIndex={currentLineIndex}
                      highlightedWordIndex={highlightedWordIndex}
                      selectedCharacter={selectedCharacter}
                    />
                  </li>
                );
              })
            ) : (
              <span>No Data Found</span>
            )}
          </ul>
        </CustomAccordion>
        <CustomAccordion
          header='Emotional Beats'
          icon={<HeartIcon className='h-4 w-4 text-[#FF8280]' />}
        >
          <ul className='list-disc list-inside pl-5 text-[#09090B] text-sm flex flex-col gap-1'>
            {sceneAnalysisData?.emotionalBeats?.length > 0 ? (
              sceneAnalysisData?.emotionalBeats?.map((item, index) => {
                return (
                  <li key={index}>
                    <HighlightedText
                      text={item}
                      lineIndex={-1}
                      currentLineIndex={currentLineIndex}
                      highlightedWordIndex={highlightedWordIndex}
                      selectedCharacter={selectedCharacter}
                    />
                  </li>
                );
              })
            ) : (
              <span>No Data Found</span>
            )}
          </ul>
        </CustomAccordion>
        <CustomAccordion
          header='Character Motivation'
          icon={<BrainIcon className='h-4 w-4 text-[#FCE072]' />}
        >
          <div className='list-disc list-inside pl-5 text-[#09090B] text-sm'>
            {sceneAnalysisData?.characterMotivation?.length > 0 ? (
              sceneAnalysisData?.characterMotivation?.map((item, index) => {
                return (
                  <div key={index}>
                    <p className='font-medium'>
                      <HighlightedText
                        text={item?.characterName}
                        lineIndex={-1}
                        currentLineIndex={currentLineIndex}
                        highlightedWordIndex={highlightedWordIndex}
                        selectedCharacter={selectedCharacter}
                      />
                    </p>
                    <span>
                      <HighlightedText
                        text={item?.motivation}
                        lineIndex={-1}
                        currentLineIndex={currentLineIndex}
                        highlightedWordIndex={highlightedWordIndex}
                        selectedCharacter={selectedCharacter}
                      />
                    </span>
                  </div>
                );
              })
            ) : (
              <span>No Data Found</span>
            )}
          </div>
        </CustomAccordion>
        <CustomAccordion
          header='Subtext & Transitions'
          icon={<ArrowRightIcon className='h-4 w-4 text-[#FFB49A]' />}
        >
          <ul className='list-disc list-inside pl-5 text-[#09090B] text-sm'>
            {sceneAnalysisData?.subtextTransitions?.length > 0 ? (
              sceneAnalysisData?.subtextTransitions?.map((item, index) => {
                return (
                  <li key={index}>
                    <HighlightedText
                      text={item}
                      lineIndex={-1}
                      currentLineIndex={currentLineIndex}
                      highlightedWordIndex={highlightedWordIndex}
                      selectedCharacter={selectedCharacter}
                    />
                  </li>
                );
              })
            ) : (
              <span>No Data Found</span>
            )}
          </ul>
        </CustomAccordion>
        <CustomAccordion
          header='Tone & Energy Levels'
          icon={<StatisticsIcon className='!h-4 !w-4 !text-[#A7ECDA]' />}
        >
          <ul className='list-disc list-inside pl-5 text-[#09090B] text-sm'>
            {sceneAnalysisData?.toneEnergy?.length > 0 ? (
              sceneAnalysisData?.toneEnergy?.map((item, index) => {
                const energy = item?.energyMap
                  .map((item) => item.energy)
                  .join(', ');
                return (
                  <div key={index}>
                    <li>
                      <b>Tone: </b>
                      <HighlightedText
                        text={item?.tone}
                        lineIndex={-1}
                        currentLineIndex={currentLineIndex}
                        highlightedWordIndex={highlightedWordIndex}
                        selectedCharacter={selectedCharacter}
                      />
                    </li>
                    <li>
                      <b>Energy: </b>
                      <HighlightedText
                        text={energy}
                        lineIndex={-1}
                        currentLineIndex={currentLineIndex}
                        highlightedWordIndex={highlightedWordIndex}
                        selectedCharacter={selectedCharacter}
                      />
                    </li>
                  </div>
                );
              })
            ) : (
              <span>No Data Found</span>
            )}
          </ul>
        </CustomAccordion>
      </div>
    </CustomTabPanel>
  );
};

