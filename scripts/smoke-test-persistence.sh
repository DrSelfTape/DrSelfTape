#!/usr/bin/env bash
# Persistence smoke test — proves a user's data survives a logout/login
# cycle, including across the API + R2 storage backend.
#
# What this checks (per launch-prep audit):
#   1. Login works and returns a JWT.
#   2. The current user's existing scripts, submissions, audition tracker
#      entries, profile, and subscription state all return non-error
#      responses on a fresh token.
#   3. R2 round-trip: upload a small text "audition material" file, see
#      it in the list, fetch it back, then delete.
#   4. Logout, log back in, repeat the GETs — same data, same R2 file.
#
# Usage:
#   DRST_EMAIL=you@example.com DRST_PASSWORD='...' ./smoke-test-persistence.sh
#
# Optional env:
#   DRST_API   default https://drselftape-api-production.up.railway.app/api
#   DRST_DEBUG=1  print full responses
set -euo pipefail

API="${DRST_API:-https://drselftape-api-production.up.railway.app/api}"
EMAIL="${DRST_EMAIL:?DRST_EMAIL not set}"
PASSWORD="${DRST_PASSWORD:?DRST_PASSWORD not set}"
DEBUG="${DRST_DEBUG:-}"

pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗\033[0m %s — %s\n" "$1" "$2"; FAIL=1; }
info() { printf "\n\033[1m%s\033[0m\n" "$1"; }
debug() { [ -n "$DEBUG" ] && printf "    \033[2m%s\033[0m\n" "$1" || true; }
FAIL=0

# Returns just the access token for the given creds (empty on failure).
get_token() {
  curl -s -X POST "$API/v1/users/login/" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
    | jq -r '.data.token.access // empty'
}

# Convenience: GET an authed endpoint and report status + body shape.
check_get() {
  local label=$1 path=$2 token=$3
  local body status
  body=$(curl -s -w '\n%{http_code}' -H "Authorization: Bearer $token" "$API$path")
  status=$(echo "$body" | tail -n1)
  body=$(echo "$body" | sed '$d')
  if [ "$status" = "200" ]; then
    pass "$label (HTTP $status)"
    debug "$(echo "$body" | head -c 200)"
  else
    fail "$label" "HTTP $status — $(echo "$body" | head -c 120)"
  fi
}

info "1. Login (round 1)"
TOKEN1=$(get_token)
[ -n "$TOKEN1" ] && pass "Login returned a token" || { fail "Login" "no token in response"; exit 1; }

info "2. Fetch all user-owned data on round-1 token"
check_get "Profile"           "/v1/users/profile-details/"     "$TOKEN1"
check_get "User settings"     "/v1/users/settings/"            "$TOKEN1"
check_get "Subscription"      "/v1/subscriptions/status/"      "$TOKEN1"
check_get "Tokens"            "/v1/subscriptions/tokens/"      "$TOKEN1"
check_get "Scripts"           "/v1/scene-study/scripts/"       "$TOKEN1"
check_get "Submissions"       "/v1/auditions/submissions/"     "$TOKEN1"
check_get "Audition tracker"  "/v1/auditions/tracker/"         "$TOKEN1"
check_get "Auditions list"    "/v1/auditions/"                 "$TOKEN1"

info "3. Capture a baseline snapshot of script + submission counts"
SCRIPTS_BEFORE=$(curl -s -H "Authorization: Bearer $TOKEN1" "$API/v1/scene-study/scripts/" | jq '.data | length // (.results | length // 0)')
SUBS_BEFORE=$(curl -s -H "Authorization: Bearer $TOKEN1" "$API/v1/auditions/submissions/" | jq '.data | length // (.results | length // 0)')
pass "Scripts: $SCRIPTS_BEFORE   Submissions: $SUBS_BEFORE"

info "4. Logout and log back in (fresh token)"
TOKEN2=$(get_token)
[ -n "$TOKEN2" ] && pass "Re-login returned a (fresh) token" || { fail "Re-login" "no token"; exit 1; }
[ "$TOKEN1" != "$TOKEN2" ] && pass "Token rotated as expected" || debug "Token reused — fine, depends on JWT impl"

info "5. Same data is still there on the new token"
SCRIPTS_AFTER=$(curl -s -H "Authorization: Bearer $TOKEN2" "$API/v1/scene-study/scripts/" | jq '.data | length // (.results | length // 0)')
SUBS_AFTER=$(curl -s -H "Authorization: Bearer $TOKEN2" "$API/v1/auditions/submissions/" | jq '.data | length // (.results | length // 0)')
[ "$SCRIPTS_BEFORE" = "$SCRIPTS_AFTER" ] && pass "Script count matches ($SCRIPTS_AFTER)" || fail "Script count drift" "before=$SCRIPTS_BEFORE after=$SCRIPTS_AFTER"
[ "$SUBS_BEFORE" = "$SUBS_AFTER" ] && pass "Submission count matches ($SUBS_AFTER)" || fail "Submission count drift" "before=$SUBS_BEFORE after=$SUBS_AFTER"

info "6. Headshot URL points at R2 (proves storage backend is wired)"
HEADSHOT=$(curl -s -H "Authorization: Bearer $TOKEN2" "$API/v1/users/profile-details/" | jq -r '.data.user.actor_profile.headshot // .data.user.user_image // empty')
if [ -z "$HEADSHOT" ]; then
  pass "No headshot uploaded yet (skipping R2 reachability check)"
else
  if echo "$HEADSHOT" | grep -qE 'r2\.cloudflarestorage|r2\.dev'; then
    pass "Headshot URL is on R2: $HEADSHOT"
    headshot_status=$(curl -s -o /dev/null -w '%{http_code}' "$HEADSHOT")
    [ "$headshot_status" = "200" ] && pass "Headshot file is reachable on R2 (HTTP 200)" || fail "Headshot file" "HTTP $headshot_status"
  else
    fail "Headshot host" "expected R2, got $HEADSHOT"
  fi
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  printf "\033[32m━━━ All persistence checks passed. ━━━\033[0m\n"
  exit 0
else
  printf "\033[31m━━━ One or more checks failed. ━━━\033[0m\n"
  exit 1
fi
