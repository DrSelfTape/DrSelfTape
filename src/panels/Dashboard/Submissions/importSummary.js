// The import endpoint upserts: a row matching an existing project + role is
// updated, not added. Say which happened instead of calling every row "added".
const plural = (n) => `${n} submission${n === 1 ? '' : 's'}`;

export function importSummary(payload, selectedCount) {
  const created = payload?.created;
  const updated = payload?.updated;
  if (!Number.isFinite(created) || !Number.isFinite(updated)) {
    return `${plural(selectedCount)} imported to your tracker`;
  }
  if (created && updated) return `${plural(created)} added and ${updated} updated in your tracker`;
  if (updated) return `${plural(updated)} updated in your tracker`;
  if (created) return `${plural(created)} added to your tracker`;
  return 'Nothing new to import — your tracker already matches this report';
}
