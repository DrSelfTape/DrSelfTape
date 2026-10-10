/**
 * A small `sx` shim, so removing @mui did not mean editing 42 call sites.
 *
 * MUI's `sx` prop accepts plain CSS plus two things inline style cannot do:
 * theme tokens ('primary.main') and nested state selectors ('&:hover'). 16 of
 * the 32 CustomButton callers pass one or both, so dropping the prop would
 * have meant touching every one of them and re-checking each screen.
 *
 * This keeps the prop working for the shapes we actually use. It is
 * deliberately NOT a general sx implementation — no responsive arrays, no
 * spacing shorthand (`mt: 2`), no variants. A grep across src/ on 2026-10-10
 * found none of those in use; if one appears, extend this rather than
 * reaching back for MUI.
 */

// MUI was never themed — there is no createTheme or palette anywhere in the
// app, so these tokens were resolving to MUI's DEFAULT palette all along.
// They are reproduced verbatim so the swap changes no pixels. That the
// default button is Material blue rather than a brand colour is a real design
// question, but it is a SEPARATE one from this refactor.
const TOKENS = {
  'primary.main': '#1976d2',
  'primary.dark': '#1565c0',
  'primary.light': '#42a5f5',
  'primary.gray': '#6b7280',
  'primary.contrastText': '#fff',
  'error.main': '#d32f2f',
  'text.primary': 'rgba(0, 0, 0, 0.87)',
  'text.secondary': 'rgba(0, 0, 0, 0.6)',
};

/** Resolve a single value: a theme token becomes its colour, anything else passes through. */
export function token(value) {
  return typeof value === 'string' && TOKENS[value] ? TOKENS[value] : value;
}

/**
 * Split an sx object into a plain inline-style object and its state blocks.
 * Returns { style, hover, disabled } — all three plain CSS objects.
 */
export function splitSx(sx) {
  const style = {};
  let hover = null;
  let disabled = null;
  if (!sx || typeof sx !== 'object') return { style, hover, disabled };

  for (const [key, value] of Object.entries(sx)) {
    if (value === undefined || value === null) continue;
    if (key === '&:hover') { hover = resolveAll(value); continue; }
    if (key === '&:disabled' || key === '&.Mui-disabled') { disabled = resolveAll(value); continue; }
    // Any other nested selector cannot be expressed inline. Dropping it
    // silently would be a quiet visual regression, so say so in development.
    if (key.startsWith('&') || key.startsWith('@')) {
      if (import.meta.env?.DEV) {
        console.warn(`[sx] unsupported selector "${key}" ignored — express it in controls.css instead`);
      }
      continue;
    }
    // Responsive objects ({ xs: '100%', md: 'fit-content' }) cannot be inline
    // styles. Every live instance is already duplicated by a Tailwind class on
    // the same element (e.g. `!w-full xs:!w-fit`), and MUI resolved them
    // against an unconfigured theme anyway, so dropping them is a no-op. Emit
    // [object Object] into a style and you get a silent layout bug instead.
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (import.meta.env?.DEV) {
        console.warn(`[sx] responsive value for "${key}" ignored — use a Tailwind class`);
      }
      continue;
    }
    style[key] = token(value);
  }
  return { style, hover, disabled };
}

function resolveAll(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out[k] = token(v);
  }
  return out;
}
