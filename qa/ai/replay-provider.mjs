import { readFile } from 'node:fs/promises';
import { sampleReview } from '../../src/data/sampleReview.js';

export default class ReviewReplayProvider {
  id() { return 'dst-review-replay'; }
  async callApi(_prompt, context) {
    if (!process.env.DST_REVIEW_EVAL_INPUT) {
      if (context.vars.caseId === 'invalid-timestamp-control') return { output: JSON.stringify({ ...sampleReview, verdict: 'Around 0:62, the listening changes.' }), metadata: { source: 'deliberately invalid fixture' } };
      if (context.vars.caseId !== 'editorial-sample') return { error: 'Provide DST_REVIEW_EVAL_INPUT for non-fixture cases.' };
      return { output: JSON.stringify(sampleReview), metadata: { source: 'fictional editorial fixture; not model-generated' } };
    }
    const data = JSON.parse(await readFile(process.env.DST_REVIEW_EVAL_INPUT, 'utf8'));
    const item = data.find(x => x.caseId === context.vars.caseId);
    if (!item?.review) return { error: 'Missing approved replay output for ' + context.vars.caseId };
    return { output: JSON.stringify(item.review), metadata: { source: 'local replay; no live model call' } };
  }
}
