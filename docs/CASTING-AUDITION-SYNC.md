# DST audition companion

## Intended experience

Actors connect their audition intake once. Actors Access and Casting Networks notices become a private DST audition inbox. DST helps them respond, prepare, rehearse, record, review and submit on time. Public profile links are supporting conveniences, not the sync mechanism.

## Current implementation status

- Added private public-profile bookmarks for Actors Access and Casting Networks to mobile and desktop Profile, with provider-specific tutorials and confirmed server saves.
- Added access to the existing reminder preference and device notification setup alongside those links.
- Existing DST tools can import pasted breakdown text, screenshots and PDFs, rehearse, record and review tapes, and track audition outcomes.
- Existing backend deadline reminders have quiet hours, opt-out and duplicate protection. Their production scheduler/delivery has not been verified in this change.
- Automatic incoming-email intake, account OAuth, private-platform sync and the complete workflow below are **not implemented or activated**. No casting-platform passwords are collected.

## First integration: a private forwarding address

Use a receiving-email provider and a dedicated subdomain. Give each consenting actor an unguessable, revocable forwarding address. Show a test-message confirmation before calling intake connected. Actors can forward individual notices or configure a narrowly scoped email rule. Do not request access to their entire inbox for this first version.

Receiving service/domain configuration is needed before this can be activated. Existing backend email configuration is outbound SMTP only. Gmail OAuth is an alternative, with Google consent configuration, required scopes and possible verification; it is not a shortcut to private casting-platform access.

## Notice-to-submission journey

1. **Notice received.** Verify the receiving provider's webhook signature and timestamp. Resolve only an active private recipient token. Enforce size/rate limits; deduplicate provider events and message IDs. Store the original notice privately with retention and deletion controls. Send an in-app “New notice to review” alert, not an invented audition/deadline.
2. **Review details.** Extract project, role, casting office, source, audition type, instructions, deadline text, timezone, required files and original link. Treat email content as untrusted data. Show source text beside extracted fields. Missing dates, ambiguous timezones and conflicting updates require actor review. Never infer a deadline from an email's received date.
3. **Confirm the audition.** Create an actor-owned audition with a separate self-tape deadline, callback time and preparation stage. Preserve exact instructions and the original link. A confirmed deadline drives reminders; an unreviewed suggestion does not.
4. **Prepare.** Checklist: acknowledge the invitation on the original platform, read instructions, attach authorized sides, choose a rehearsal plan and schedule recording. Take the actor directly into existing DST practice/reader tools while retaining the audition context.
5. **Record and review.** Associate takes and AI notes with the audition. Show requirements such as slate, framing, file naming and requested takes. Offer studio booking when the actor wants in-person help.
6. **Submit.** Open the official submission destination. The actor uploads and confirms submission; exporting a tape is not proof of submission. Keep due reminders active until submission is confirmed. Store actor-confirmed submission time and optional receipt.
7. **Follow through.** Track callbacks, changed deadlines, holds and outcomes. Offer relevant preparation for the next stage. Do not auto-send messages to casting or representatives.

## Essential engineering changes

- Add durable notice, private intake-address and provider-event records. Actor-scoped queries, revocation, account deletion, strict webhook authentication, bounded attachments and replay protection are required before public launch.
- Add an audition-level deadline. The current slot uses a shared Project deadline for reminders; personal extensions must not change another actor's deadline. Keep callback time distinct.
- Add an independent preparation stage (received, preparing, recorded, ready, submitted). Existing casting outcomes such as callback/booked/passed must remain separate.
- Store extracted suggestions separately from actor-confirmed fields. Deadline changes create an explicit review item, retain history and invalidate superseded reminder jobs.
- Do not use project title alone to merge notices. Prefer source identifiers; uncertain matches need actor confirmation. Repeated email delivery must not create duplicate auditions or alerts.
- Add a mobile inbox and tutorial with intake health, last successful receipt, test status, disconnect and delete controls. Distinguish “profile saved,” “email intake connected,” and “notice needs review.”
- Keep links allowlisted and open them through the existing external-browser utility. Do not automatically fetch arbitrary email URLs or assume access to protected sides.
- Add tests for signature rejection/replays, account separation, missing dates, timezone/DST ambiguity, revised deadlines, duplicates, permission denial, opt-out, submission suppression and failed delivery retry.

## Notifications

Start with notice received, details needing review, confirmed deadline reminders and changed-deadline alerts. Reuse quiet hours and existing preferences. Add an actor-selected preparation reminder. Alerts deep-link to the correct audition and show what action remains. Push delivery is best effort; show deadlines persistently in the app as well.

## Limits that must be clear to actors

An email may only say “you have a message” and link to protected CMail or a casting request. DST cannot obtain the private instructions or sides from that notification alone. Show “Open original notice to complete details,” then accept paste, screenshot or an authorized file import. Public profile URLs do not authorize private inbox access. True direct platform sync requires a supported integration or partner access, which has not been established.

## Official references

- Actors Access public Custom Link: https://actorsaccess.freshdesk.com/support/solutions/articles/17000046534-actors-setting-up-and-sharing-your-custom-link
- Actors Access audition communication: https://actorsaccess.freshdesk.com/support/solutions/articles/17000089252-actors-how-casting-directors-will-contact-you-regarding-auditions
- Casting Networks public profile link and Premium requirement: https://support.castingnetworks.com/en/articles/11227841
- Casting Networks audition requests and notification forwarding: https://support.castingnetworks.com/en/articles/11228289

No new TestFlight build or production deployment accompanies this document.

## Verification of the profile-link foundation

- ESLint: passed.
- Production Vite build with the production API URL: passed; existing chunk-size and mixed-import warnings remain.
- Public URL validation and real Chrome interaction tests: passed. Covered rejected private/unsafe links, confirmed saves, failed saves, failed preference changes, account switching during a pending save and a 390px viewport.
- Full frontend regression suite: passed.
- Git whitespace check: passed.
- This verifies the implemented profile controls, not the planned email intake or production push delivery.
