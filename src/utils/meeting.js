import { nanoid } from 'nanoid';

const HOST_STORAGE_PREFIX = 'dr-self-tapes_meeting_host_';

export const createMeeting = () => {
  const meetingId = nanoid();
  localStorage.setItem(`${HOST_STORAGE_PREFIX}${meetingId}`, 'true');
  const meetingUrl = `${window.location.origin}/meeting/${meetingId}`;
  window.open(meetingUrl, '_blank', 'noopener,noreferrer');
  return { meetingId, meetingUrl };
};

export const isMeetingHost = (meetingId) =>
  Boolean(localStorage.getItem(`${HOST_STORAGE_PREFIX}${meetingId}`));

export const clearMeetingHostFlag = (meetingId) => {
  localStorage.removeItem(`${HOST_STORAGE_PREFIX}${meetingId}`);
};

export const meetingUrlForId = (meetingId) =>
  `${window.location.origin}/meeting/${meetingId}`;

