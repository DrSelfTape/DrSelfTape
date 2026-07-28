# Animation plans

Written by the `improve-animations` skill. Each plan is self-contained — an
executor needs zero other context. Source findings: `find-animation-opportunities`
sweep of 2026-07-28.

| # | Plan | Severity | Status |
| --- | --- | --- | --- |
| 001 | [Stage the Tape Review result reveal](001-tape-review-reveal.md) | HIGH | DONE |
| 002 | [Stage the Compare Takes winner reveal](002-compare-takes-winner-reveal.md) | HIGH | DONE |
| 003 | [Press feedback on gradient CTAs](003-cta-press-feedback.md) | MEDIUM | DONE |
| 004 | [Banner entrances](004-banner-entrances.md) | MEDIUM | DONE |

## Execution order

002 depends on 001 (reuses its `.tr-reveal` CSS; 001 is DONE in the working
tree). Candidate future plans from the same sweep (not yet written): `:active`
press feedback on primary CTAs, banner entrances.

## Shipping note

Per repo practice, these are web-layer changes that ride the next planned iOS
build — do not cut a hot build for them.
