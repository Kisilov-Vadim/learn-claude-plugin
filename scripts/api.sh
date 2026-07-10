#!/bin/bash
# Usage: api.sh <message> <rpc_function> [json_data]
# Handles auth internally — no token setup needed in the caller.

MESSAGE="$1"
FUNCTION="$2"
DATA="${3:-'{}'}"

TOKEN=$(node ~/.claude/plugins/manual/learn/scripts/auth.js token 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Not logged in. Run: node ~/.claude/plugins/manual/learn/scripts/auth.js web-login"
  exit 1
fi

echo "$MESSAGE"

if [ -z "$3" ]; then
  curl -s -X POST "https://wmbtdzlcqgdfqdxvaqeb.supabase.co/rest/v1/rpc/$FUNCTION" \
    -H "Authorization: Bearer $TOKEN" \
    -H "apikey: sb_publishable_soBWDz8wvsusMhEdVLm-LA_gp6IQWhK"
else
  curl -s -X POST "https://wmbtdzlcqgdfqdxvaqeb.supabase.co/rest/v1/rpc/$FUNCTION" \
    -H "Authorization: Bearer $TOKEN" \
    -H "apikey: sb_publishable_soBWDz8wvsusMhEdVLm-LA_gp6IQWhK" \
    -H "Content-Type: application/json" \
    -d "$DATA"
fi
