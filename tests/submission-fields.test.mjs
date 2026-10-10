// Every `sub.<field>` the app reads must be a field the API actually sends.
//
// The Home screen's RECENT list read `sub.project_title || sub.project` for the
// title and `sub.character` for the role. The API sends NONE of those — the
// serializer returns `project_name` and `role`. So every row rendered
// "Untitled" with no role under it, for as long as the screen has existed,
// while the Submissions list two taps away used the right names and looked
// fine. Nothing errored: reading a missing property in JS is just `undefined`,
// and `undefined || 'Untitled'` is a perfectly good-looking bug.
//
// The contract below is DrSelfTape_BE apps/auditions/serializers.py →
// SubmissionSerializer.Meta.fields. The BE lives in a separate repo, so it is
// mirrored here rather than read: if the API gains a field, add it here on
// purpose, having checked that it is really sent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SUBMISSION_FIELDS = new Set([
  'id', 'actor', 'actor_email', 'audition_slot',
  'project_name', 'role', 'casting_office', 'casting_director',
  'submitted_via', 'submitted_at', 'deadline', 'video_url',
  'status', 'notes', 'follow_up_date',
  'created_at', 'updated_at',
]);

// Names that look plausible and are NOT sent. Each one shipped at some point.
const KNOWN_PHANTOMS = ['project_title', 'project', 'character', 'role_name', 'title'];

const SRC = new URL('../src/', import.meta.url).pathname;

// Scoped to the surfaces that actually render TapeSubmission rows. `sub` is a
// common short name — usePushNotifications.js has its own `sub` (a push
// SUBSCRIPTION, where sub.toJSON is a real method) and tripped the first,
// repo-wide version of this scan. A guard that cries wolf gets muted, so it
// only looks where the name means what this test thinks it means.
const SUBMISSION_SURFACES = [
  'panels/Mobile/MobileApp.jsx',
  'panels/Dashboard/Submissions/index.jsx',
];

function walk() {
  return SUBMISSION_SURFACES.map((rel) => join(SRC, rel));
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test('no component reads a submission field the API does not send', () => {
  const problems = [];
  for (const file of walk()) {
    const text = stripComments(readFileSync(file, 'utf8'));
    // `sub` is the conventional loop variable for a TapeSubmission across the
    // mobile shell and the Submissions panel.
    for (const m of text.matchAll(/\bsub\.([a-z_][a-z0-9_]*)\b/gi)) {
      const field = m[1];
      if (SUBMISSION_FIELDS.has(field)) continue;
      const line = text.slice(0, m.index).split('\n').length;
      const hint = KNOWN_PHANTOMS.includes(field)
        ? ` — known phantom; the API sends project_name / role`
        : '';
      problems.push(`${file.replace(SRC, 'src/')}:${line} reads sub.${field}${hint}`);
    }
  }
  assert.deepEqual(
    problems, [],
    'These read a property SubmissionSerializer never sends, so they silently render ' +
    `undefined:\n  ${problems.join('\n  ')}`
  );
});

test('the Recent list on Home shows the project name and role', () => {
  const shell = stripComments(
    readFileSync(join(SRC, 'panels/Mobile/MobileApp.jsx'), 'utf8')
  );
  const recent = shell.slice(shell.indexOf('>RECENT<') - 2000, shell.indexOf('>RECENT<') + 4000);
  assert.ok(recent.includes('sub.project_name'), 'Recent should title rows with sub.project_name');
  assert.ok(recent.includes('sub.role'), 'Recent should show the role from sub.role');
});
