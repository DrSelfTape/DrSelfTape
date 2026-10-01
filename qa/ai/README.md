# Tape Review evaluation pilot

This package is separate from the mobile app. Promptfoo runs local replay checks with telemetry disabled; it does not contact a model provider in the default configuration.

From this folder: `yarn test`, then `yarn eval`. Results go to `../../output/qa/ai/results.json`.

The initial replay is the app's explicitly fictional editorial sample. Passing it proves that the evaluation plumbing runs, **not** that Jericho's model is accurate. Negative-control tests deliberately insert fabricated history, booking guarantees, invalid timestamps, unsupported scores, and broken fields to verify that the checks fail.

## Evaluate saved model outputs

1. Put approved, de-identified outputs in an ignored local JSON file: `[{"caseId":"example-1","review":{...}}]`.
2. Copy the config and replace its test cases with the same IDs and accurate context: `mode` (`headline`, `summary`, or `full`), `hasHistory`, `durationSeconds`, and `unsupportedDimensions`.
3. Run `DST_REVIEW_EVAL_INPUT=/absolute/path/reviews.json yarn promptfoo eval -c your-config.yaml --no-cache`, setting `PROMPTFOO_DISABLE_TELEMETRY=1` and `PROMPTFOO_DISABLE_UPDATE=1` too.
4. Compare outputs from a prompt/model change against the same cases. Keep source clip and reviewer permission outside Git.

## Human calibration before a quality claim

Assemble a small consented set covering comedy, drama, listening, intentional looking away, low light, missing audio, prior-history/no-history, and short/long tapes. For each, an acting coach records observable evidence, acceptable interpretations, one useful next-take action, and dimensions that cannot be assessed. Grade groundedness, actionable coaching, contradictions, and tone. A string-matching rule cannot determine acting truth or prove an eyeline observation correct.

Do not use self-generated personas as ground truth. Do not treat pass rates on this tiny fictional fixture as production performance. No live video analysis, model spend, or production account access is included in this pilot.
