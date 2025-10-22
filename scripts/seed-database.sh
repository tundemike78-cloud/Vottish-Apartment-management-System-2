#!/bin/bash

if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🌱 Seeding database with properties, units, and work orders..."
echo ""

RESPONSE=$(curl -s -X POST "${VITE_SUPABASE_URL}/functions/v1/seed-database" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Seed complete!"
