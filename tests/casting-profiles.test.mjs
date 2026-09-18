import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeCastingProfile } from '../src/utils/castingProfiles.js';

test('casting links accept only supported public profiles', () => {
  assert.equal(normalizeCastingProfile('actors_access_profile_url', ' resumes.actorsaccess.com/alex '), 'https://resumes.actorsaccess.com/alex');
  assert.equal(normalizeCastingProfile('actors_access_profile_url', 'https://resumes.breakdownexpress.com/alex'), 'https://resumes.breakdownexpress.com/alex');
  assert.equal(normalizeCastingProfile('casting_networks_profile_url', 'https://app.castingnetworks.com/talent/public-profile/alex-actor'), 'https://app.castingnetworks.com/talent/public-profile/alex-actor');
  for (const value of ['javascript:alert(1)', 'http://resumes.actorsaccess.com/alex', 'https://actorsaccess.com/comcenter/', 'https://resumes.actorsaccess.com.evil.test/alex', 'https://name:secret@resumes.actorsaccess.com/alex', 'https://resumes.actorsaccess.com/alex?token=secret', 'https://resumes.actorsaccess.com/', 'https://resumes.actorsaccess.com/a%2fb', 'https://resumes.actorsaccess.com:444/alex']) {
    assert.throws(() => normalizeCastingProfile('actors_access_profile_url', value), value);
  }
  assert.throws(() => normalizeCastingProfile('casting_networks_profile_url', 'https://app.castingnetworks.com/account'));
});
