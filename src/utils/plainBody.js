// Turn whatever a form hands us into a plain object we can spread into a
// JSON body. Spreading a FormData directly yields {} (it has no enumerable
// own properties), which is how the signup payload lost every field for a
// month and the server answered "This field is required" four times.
//
// Strings only. A File or Blob would serialise to {} in a JSON body, so any
// form that carries a file (headshot) must keep sending multipart instead.
export function plainBody(input) {
  if (input == null) return {};
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    const out = {};
    for (const [key, value] of input.entries()) out[key] = value;
    return out;
  }
  if (typeof input === 'object') return { ...input };
  return {};
}
