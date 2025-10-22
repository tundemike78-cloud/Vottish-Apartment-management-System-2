#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🌱 Seeding test users to Supabase..."
echo ""

RESPONSE=$(curl -s -X POST "${VITE_SUPABASE_URL}/functions/v1/seed-auth" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Seed script complete!"
echo ""
echo "Test Users Created:"
echo "  1. Mikeoye28@gmail.com / Test@12345 (Owner)"
echo "  2. tenant+demo@vottsh.test / Test@12345 (Tenant)"
echo "  3. vendor+demo@vottsh.test / Test@12345 (Vendor)"
