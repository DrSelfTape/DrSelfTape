/**
 * The reader's voice roster — the five ElevenLabs voices the BE's TTS endpoint
 * knows (see TTSView.VOICE_MAP). Shared so the role picker and Live Study Mode
 * can't drift apart on ids or labels.
 */
export const PARTNER_VOICES = [
  { id: 'partner_male',    label: 'George',  desc: 'Warm & Captivating',  accent: 'British',  gender: 'Male',    emoji: '👨' },
  { id: 'partner_female',  label: 'Lily',    desc: 'Velvety Actress',     accent: 'British',  gender: 'Female',  emoji: '👩' },
  { id: 'partner_neutral', label: 'River',   desc: 'Calm & Neutral',      accent: 'American', gender: 'Neutral', emoji: '🧑' },
  { id: 'cd_female',       label: 'Sarah',   desc: 'Mature & Confident',  accent: 'American', gender: 'Female',  emoji: '👩‍💼' },
  { id: 'cd_male',         label: 'Daniel',  desc: 'Steady Broadcaster',  accent: 'British',  gender: 'Male',    emoji: '👨‍💼' },
];

export const PARTNER_VOICE_IDS = PARTNER_VOICES.map((v) => v.id);

export const DEFAULT_PARTNER_VOICE = 'partner_male';

/** Display name for a voice id ('partner_female' → 'Lily'). */
export function voiceLabel(id) {
  return PARTNER_VOICES.find((v) => v.id === id)?.label || 'Reader';
}

/**
 * Deal every non-user character its own voice.
 *
 * The lead partner keeps whatever the actor picked; everyone after that takes
 * the next unused voice in roster order, so a three-hander stops sounding like
 * one person doing all the parts. Order in, order out — the same script always
 * produces the same casting, which matters because the TTS cache is keyed on
 * (line, voice) and a reshuffle would silently re-render every line.
 *
 * @param {string[]} partnerCharacters  non-user characters, in script order
 * @param {string}   primaryVoiceId     the voice the actor chose for the lead
 * @param {Object}   overrides          explicit per-character picks, id by name
 * @returns {Object} character name → voice id
 */
export function assignPartnerVoices(partnerCharacters, primaryVoiceId, overrides = {}) {
  const primary = PARTNER_VOICE_IDS.includes(primaryVoiceId) ? primaryVoiceId : DEFAULT_PARTNER_VOICE;
  const assigned = {};
  const used = new Set();

  (partnerCharacters || []).forEach((name, i) => {
    if (!name) return;
    // More characters than voices → wrap. Still deterministic, and a repeat
    // voice this deep in a scene beats leaving someone unvoiced.
    const id = i === 0
      ? primary
      : (PARTNER_VOICE_IDS.find((v) => !used.has(v)) || PARTNER_VOICE_IDS[i % PARTNER_VOICE_IDS.length]);
    used.add(id);
    assigned[name] = id;
  });

  Object.keys(overrides || {}).forEach((name) => {
    if (assigned[name] && PARTNER_VOICE_IDS.includes(overrides[name])) {
      assigned[name] = overrides[name];
    }
  });

  return assigned;
}
