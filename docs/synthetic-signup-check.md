# Synthetic email signup check

Runs the real signup page at a mobile viewport, submits the real form, checks the returned identity and authenticated profile, waits for the post-signup UI, then deletes the account through the ordinary account-deletion endpoint. It never uploads a tape, calls a paid AI provider, buys a subscription, or sends a customer message.

## Run

From this frontend checkout, after `npm install`:

```sh
# Public-page check: fills and submits the form locally, intercepting the POST
# before it reaches the API. No account is created.
node scripts/synthetic-signup.mjs --preflight

# Full check: requires the accompanying backend protections to be deployed.
node scripts/synthetic-signup.mjs

# Recover/delete an account from an interrupted or failed run.
node scripts/synthetic-signup.mjs --cleanup
```

Defaults: `https://drselftape.app`, API `https://drselftape-api-production.up.railway.app/api` (the origin the production bundle actually posts to; the monitor only lets a registration POST through when it targets this exact API), and installed macOS Google Chrome. Set `DST_SYNTHETIC_WEB_URL`, `DST_SYNTHETIC_API_URL`, `DST_SYNTHETIC_CHROME`, or `DST_SYNTHETIC_OUTPUT` to override. Remote targets require HTTPS. The local integration test uses HTTP loopback only.

## Result and failure behavior

`output/synthetic-signup/latest.json` contains PASS / FAIL / BLOCKED, mode, last stage, timing, cleanup status, and a bounded description of coverage. Mode-specific `preflight.json`, `full.json`, and `cleanup.json` preserve the last result of each kind. Exit codes: 0 pass, 1 failure, 2 missing backend protections.

A preflight PASS is **not** a successful registration. A full PASS requires a successful API response, the correct authenticated account, a visible post-signup screen, and confirmed cleanup. It covers web email signup, not Sign in with Apple, native releases, email delivery, AI quality, or full onboarding/activation.

Third-party browser telemetry and unrelated mutation requests are blocked. The server recognizes only `synthetic-<32 lowercase hex characters>@synthetic.drselftapes.invalid`, suppresses its PostHog/Meta events and reader-pool presence, marks its signup source `synthetic`, and opts it out of broadcasts. This is not a privileged account or a validation/authentication bypass. Ordinary signup validation and deletion password checks still apply. No DB migration is needed.

The monitor checks the registration endpoint's GET capability response before submitting. Until the backend changes are deployed, the full check reports BLOCKED and creates no account. The backend changes are in `apps/users/synthetic.py`, registration, signals, and the two analytics capture modules.

## Interrupted runs

A random password and non-deliverable address are written **before submission** to a mode-0600 `pending-account.json` in the ignored output directory. Tokens and passwords are never written to the public status report. A failure or uncertain signup response triggers cleanup by logging in with those exact credentials, verifying both email and account ID, and deleting that account only. If cleanup cannot be confirmed, the recovery file remains and subsequent signup runs stop. `--cleanup` retries the authenticated deletion.

If registration never created an account, login-based cleanup may be unable to confirm that; the run remains failed rather than pretending cleanup succeeded. Inspect that exact reserved address in the backend before removing the recovery file. If a process is killed, inspect `running.lock` and confirm the recorded PID is no longer running before removing the stale lock. Never remove recovery files merely to make the monitor green.

## Tests

```sh
node --test tests/synthetic-signup.test.mjs tests/email-validation.test.mjs
```

Backend: `manage.py test apps.users.tests_synthetic_signup apps.analytics.tests` exercises real registration, authentication, deletion, age/password enforcement, and normal-vs-synthetic analytics. Set `DST_SYNTHETIC_FRONTEND` to this checkout and run `manage.py test apps.users.tests_synthetic_browser` to exercise the actual frontend against a temporary Django live server and PostgreSQL test database. The browser integration requires Node, installed frontend dependencies, and Chrome.

## Rollout

### Validation recorded September 9, 2026 (Pacific)

- Seven frontend/monitor tests passed.
- Fourteen backend signup and analytics tests passed.
- Real Chrome integration passed against local Vite, Django, and an isolated PostgreSQL test database: preflight created no account; full signup reached the post-signup screen and deleted its account successfully.
- Public production preflight failed at form submission (no POST reached the API), consistent with the old email validator. No production account was created. This is not a production end-to-end PASS.
- Changes are local; production deployment and scheduled monitoring are not enabled.

### Production validation recorded September 9, 2026, 8:00 PM (Pacific)

- Backend (fb505b1) and frontend (63a7cb3) deployed. The script default API is now the Railway origin the production bundle posts to; the earlier production preflight failure was partly that mismatch (the interceptor aborts a registration POST aimed at any other origin), not only the old validator.
- Production preflight PASS (form submitted, POST intercepted, no account). Production full PASS: `mode: full`, `status: PASS`, `cleanup: deleted`, under 6 seconds.
- launchd job installed at `~/Library/LaunchAgents/com.drselftapes.synthetic-signup.plist`, daily 7:30 AM, and kickstarted once through launchd: PASS. Results land in `output/synthetic-signup/latest.json`; a FAIL is only visible there and in `scheduler-error.log` until it is wired to the dashboard or an alert.

1. Review and deploy the backend protections and frontend email-validator fix through the normal release processes. The previous frontend validator rejects subdomains and long domain endings, including the reserved synthetic address.
2. Run one full check and confirm `mode: full`, `status: PASS`, and `cleanup: deleted`.
3. Enable a daily run on an always-on machine. Keep output private and surface the redacted report in the local dashboard; the monitor does not automatically message anyone.
4. Watch for stale reports as well as failures. Do not run on every dashboard refresh or count these accounts as new customers.

The sample launchd file is provided for review; it is **not installed or enabled automatically**. Update absolute paths for another machine. The Mac must be available for scheduled checks; this is not a cloud uptime guarantee.
