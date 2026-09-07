import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOfferCopy, normalizePersonalization, personalizationProperties } from '../src/data/onboardingPersonalization.js';

const contexts = [
  ['auditioning_now', 'Get notes before you send your audition. Free.', 'before the next take'],
  ['building_reel', 'Find what works in your next reel take. Free.', 'scene for your reel'],
  ['between_jobs', 'Keep your acting in practice. One free review.', 'practice between auditions'],
];
for (const [plate, headline, phrase] of contexts) {
  for (const taped_before of ['yes', 'first_time']) {
    test(`${plate} / ${taped_before} maps both answers to the offer`, () => {
      const copy = getOfferCopy({ plate, taped_before });
      assert.equal(copy.headline, headline);
      assert.ok(copy.body.includes(phrase));
      assert.ok(copy.body.includes(taped_before === 'yes' ? 'take you already have' : 'a rough take is welcome'));
      assert.deepEqual(personalizationProperties({ plate, taped_before }), {
        onboarding_plate: plate, onboarding_taped_before: taped_before,
      });
    });
  }
}
test('missing, invalid and skipped answers retain the generic offer', () => {
  const generic = getOfferCopy();
  assert.equal(generic.headline, 'Get casting notes on any take. Free.');
  for (const value of [null, {}, { plate: '', taped_before: '' }, { plate: 'invented', taped_before: false }]) {
    assert.deepEqual(getOfferCopy(value), generic);
    assert.deepEqual(normalizePersonalization(value), { plate: '', taped_before: '' });
    assert.deepEqual(personalizationProperties(value), { onboarding_plate: 'skipped', onboarding_taped_before: 'skipped' });
  }
});
test('each partial answer affects copy independently without inventing the missing answer', () => {
  for (const [plate, headline] of contexts) {
    assert.equal(getOfferCopy({ plate }).headline, headline);
    assert.ok(!getOfferCopy({ plate }).body.includes('Your first tape'));
  }
  assert.match(getOfferCopy({ taped_before: 'first_time' }).body, /Your first tape/);
  assert.match(getOfferCopy({ taped_before: 'yes' }).body, /take you already have/);
});
