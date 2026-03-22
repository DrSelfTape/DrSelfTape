/**
 * ============================================================================
 * AUDIO PLAYER CONSTANTS
 * ============================================================================
 * 
 * Centralized constants for audio player functionality.
 * Prevents magic strings/numbers scattered throughout codebase.
 * 
 * ============================================================================
 */

/**
 * Playback modes for script audio player
 */
export const PLAYBACK_MODES = {
  REHEARSAL: 'rehearsal',
  REVIEW: 'review',
  TELEPROMPTER: 'teleprompter',
  ANALYSIS: 'analysis',
};

/**
 * Script analysis modes
 */
export const SCRIPT_MODES = {
  AI_SCENE_PARTNER: 'aiScenePartner',
  SCRIPT_ANALYSIS: 'scriptAnalysis',
};

/**
 * Script analysis user modes
 */
export const SCRIPT_ANALYSIS_MODES = {
  ACTOR: 'actor',
  COACH: 'coach',
};

/**
 * Audio polling and timing constants
 */
export const AUDIO_TIMING = {
  POLLING_INTERVAL: 100, // ms - How often to check if audio ended
  ADVANCE_DELAY: 100, // ms - Delay before advancing to next line
  ENDED_THRESHOLD: 0.1, // seconds - Threshold for detecting audio end
};

/**
 * Default audio settings
 */
export const DEFAULT_AUDIO_SETTINGS = {
  TONE: 'neutral',
  VOLUME: 100, // 0-100
  SPEED: 1.0, // Playback rate
};

/**
 * Tone options for audio playback
 */
export const TONE_OPTIONS = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Emotional', value: 'emotional' },
  { label: 'Intense', value: 'intense' },
  { label: 'Casual', value: 'casual' },
];

/**
 * Speed options for audio playback
 */
export const SPEED_OPTIONS = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1.0 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2.0 },
];

