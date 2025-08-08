#!/usr/bin/env bash
set -euo pipefail
URL="https://us-central1-<PROJECT_ID>.cloudfunctions.net/importPropertyFromText"
echo "Testing OPTIONS preflight..."
curl -i -X OPTIONS "$URL" \
  -H "Origin: https://realtor-ai-mu.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
echo
echo "Testing POST..."
curl -i -X POST "$URL" \
  -H "Origin: https://realtor-ai-mu.vercel.app" \
  -H "Content-Type: application/json" \
  --data '{"text":"https://www.realtor.ca/real-estate/28705134/example","userId":"test"}'
echo