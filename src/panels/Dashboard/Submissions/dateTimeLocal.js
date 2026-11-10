// <input type="datetime-local"> speaks naive local wall time ("2026-11-09T17:00").
// The API runs in UTC with no per-user timezone, so a naive string is stored
// as that wall time in UTC — 7-8 hours early for Los Angeles. Convert at the
// form boundary in both directions.

const pad = (n) => String(n).padStart(2, '0');

/** Stored instant (ISO string or Date) → local wall time for the input. */
export function toLocalInputValue(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Input's local wall time → absolute ISO instant; null when empty or invalid. */
export function localInputToISO(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
