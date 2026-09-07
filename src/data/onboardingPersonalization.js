// Optional context for the first review, not a career-level assessment.
export const PLATE_OPTIONS = [
  { value: 'auditioning_now', label: 'Auditioning now' },
  { value: 'building_reel', label: 'Building my reel' },
  { value: 'between_jobs', label: 'Between jobs' },
];
export const TAPED_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'first_time', label: 'First time' },
];

export function normalizePersonalization(value) {
  return {
    plate: PLATE_OPTIONS.some(option => option.value === value?.plate) ? value.plate : '',
    taped_before: TAPED_OPTIONS.some(option => option.value === value?.taped_before) ? value.taped_before : '',
  };
}

export function getOfferCopy(value) {
  const { plate, taped_before } = normalizePersonalization(value);
  const headlines = {
    auditioning_now: 'Get notes before you send your audition. Free.',
    building_reel: 'Find what works in your next reel take. Free.',
    between_jobs: 'Keep your acting in practice. One free review.',
  };
  const context = {
    auditioning_now: 'See how your audition reads and get one specific thing to work on before the next take.',
    building_reel: 'Try a scene for your reel and get notes on what comes through in your performance.',
    between_jobs: 'A short scene is enough to practice between auditions. Get one specific thing to try on your next take.',
  };
  const experience = {
    yes: 'Bring a take you already have, or record our short practice scene.',
    first_time: 'Your first tape can be a practice run. We give you the lines; a rough take is welcome.',
  };
  if (!plate && !taped_before) {
    return {
      headline: 'Get casting notes on any take. Free.',
      body: 'Know how your tape reads before casting ever sees it. Jericho scores your performance, framing, and eyeline, then names the one fix that books the room.',
    };
  }
  return {
    headline: headlines[plate] || 'Get casting notes on any take. Free.',
    body: [context[plate] || 'Get casting notes and one specific thing to try on your next take.', experience[taped_before]].filter(Boolean).join(' '),
  };
}

export function personalizationProperties(value) {
  const answers = normalizePersonalization(value);
  return {
    onboarding_plate: answers.plate || 'skipped',
    onboarding_taped_before: answers.taped_before || 'skipped',
  };
}
