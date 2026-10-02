export function isAiConsentError(error) {
  const data = error?.response?.data;
  if (error?.response?.status !== 403) return false;
  if (data?.code) return data.code === 'ai_consent_required';
  // Compatibility with released servers that dropped ErrorDetail.code.
  return data?.detail === 'ai_consent_required' || data?.message ===
    'AI features require your consent before we can send data to our AI providers. Open the AI consent prompt in-app and try again.';
}
