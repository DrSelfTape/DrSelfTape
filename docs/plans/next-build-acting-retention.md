# Next build: acting retention pilot

Status: saved for the next build at the user's request on 2026-10-07. Planning only; implementation has not started. Saving this idea does not authorize an Imprint purchase, trial or terms acceptance.

## Idea

Adapt Imprint's visual microlearning approach to acting tools:

**See one concept → recall it → perform it → revisit it later.**

Start inside **Next Take Mission**, using the actor's current coaching note to introduce one short, original visual lesson before their next take. Reuse the reader, recording and Compare Takes flows. Later, reuse the same loop in Craft Journey and Daily Challenge.

## First pilot

“Give the line a job”: a three-minute exercise on objective and tactic.

1. Show a simple visual relationship between what the character wants, the obstacle and the tactic.
2. Hide the explanation and ask the actor to recall their objective and intended action.
3. Practice a short scene with two different tactics using the existing reader.
4. Compare takes and reflect on what changed in response to the partner.
5. Revisit the concept later with fresh sides. A provisional 1/3/7-day schedule is a design hypothesis, not a verified Imprint algorithm.

## Requirements to preserve

- Original acting content and visuals, reviewed for craft accuracy.
- Distinguish viewed, recall attempted, practiced and revisited. Clicks, streaks and quiz answers must not be labeled acting mastery.
- Store lesson/version, skill, recall attempt, linked practice/review ID and next review time; validate ownership server-side.
- Keep self-reported practice distinct from assessed performance.
- Use `/dashboard/scene-study` for practice handoffs.
- No silent AI credit charges; basic lesson/recall should not need a model call.
- Measure delayed recall and application to a new scene separately from app return rate.

## Before implementation

Finish the live Imprint walkthrough if terms/account access is authorized. Static inspection found staged lesson interactions and separate accuracy/completion tracking, but the active lesson flow and review scheduler remain unverified. Preserve the independent pending security work when developing this feature.

## Supporting study

- [Acting adaptation and sample lesson](../../../astra-reports/imprint-acting-learning-study.md)
- [REA/static evidence and limitations](../../../astra-reports/imprint-static-review.md)

