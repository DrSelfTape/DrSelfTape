const privateField = /^(?:authorization|cookie|set-cookie|password|passwd|secret|api[_-]?key|token|access|refresh|access_token|refresh_token|email|username|phone|script|script_text|dialogue|transcript|prompt|body|data)$/i;

function scrubString(value) {
  return value
    .replace(/\bBearer\s+[^\s,;"']+/gi, 'Bearer [redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]')
    // Private media paths and reset-link query strings can themselves grant
    // access. Keep the host for diagnosis, never the path/query/fragment.
    .replace(/https?:\/\/[^\s"'<>]+/gi, url => {
      try {
        const parsed = new URL(url);
        // Preserve public generated source locations for error symbolication.
        if (/^\/assets\/[^/]+\.(?:js|css)$/.test(parsed.pathname)) return parsed.origin + parsed.pathname;
        return `${parsed.origin}/[redacted]`;
      } catch { return '[redacted URL]'; }
    });
}

export function scrubTelemetry(value, depth = 0) {
  if (depth > 12) return '[redacted nested value]';
  if (typeof value === 'string') return scrubString(value);
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(item => scrubTelemetry(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    privateField.test(key) ? '[redacted]' : scrubTelemetry(item, depth + 1),
  ]));
}

// PostHog uses a public project token for transport. Restore only the configured
// project key after redaction, never a token supplied by event properties.
export function scrubPostHogEvent(event, projectKey) {
  const scrubbed = scrubTelemetry(event);
  if (scrubbed?.properties && typeof scrubbed.properties === 'object' && projectKey) {
    scrubbed.properties.token = projectKey;
  }
  return scrubbed;
}
