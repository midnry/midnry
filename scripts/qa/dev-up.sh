#!/bin/sh
# Start the local dev server on :8080 for browser QA if it isn't answering.
# Usage: sh scripts/qa/dev-up.sh   (from the repo root)
# OUTPOST_QA_PLAYER lets signed-out test browsers past Outpost Zero's sign-in
# screen (see src/routes/api/games/outpost-stats.ts); ADMIN_EMAIL makes the local
# qa-admin@example.test account the admin for /stats checks. The Paystack pair
# points checkout at scripts/qa/mock-paystack.mjs (local only, never Render).
cd "$(dirname "$0")/../.."
mkdir -p screenshots/qa
curl -sf -o /dev/null --max-time 3 http://127.0.0.1:8080/ && exit 0
(PATH=$PWD/node_modules/.bin:$PATH OUTPOST_QA_PLAYER=1 OUTPOST_QA_PAYSTACK_URL=http://127.0.0.1:8099 PAYSTACK_SECRET_KEY=sk_test_outpost_qa_local ADMIN_EMAIL=qa-admin@example.test VITE_AUTH_ENABLED=true BETTER_AUTH_SECRET=devsecretdevsecretdevsecretdevsecret00 setsid nohup node scripts/with-app-env.mjs vite dev --host 0.0.0.0 --port 8080 > /tmp/midnry-dev.log 2>&1 &)
i=0; until curl -sf -o /dev/null --max-time 3 http://127.0.0.1:8080/ || [ $i -ge 60 ]; do sleep 2; i=$((i+1)); done
curl -s -o /dev/null --max-time 120 http://127.0.0.1:8080/games/outpost-zero.html
echo up
