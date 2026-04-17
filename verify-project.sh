#!/bin/bash

echo "=========================================="
echo "🔍 VÉRIFICATION COMPLÈTE DU PROJET"
echo "=========================================="

echo ""
echo "📝 1. Configuration .env:"
grep -E "EXPO_PUBLIC_OWNER_BYPASS|ANTHROPIC_API_KEY" .env

echo ""
echo "✅ 2. Migrations SQL (fichiers):"
ls -1 supabase/migrations/ | tail -5

echo ""
echo "🔑 3. Clés TypeScript (types/collection.ts):"
grep -E "catalogueRef|marketplaces" types/collection.ts | head -3

echo ""
echo "🎣 4. useAIAnalysis.ts:"
grep -E "catalogueRef|marketplaces" hooks/useAIAnalysis.ts | head -3

echo ""
echo "📱 5. Tableau des pièces en base (Supabase):"
curl -s "https://opktyoxabqxpnhasbipd.supabase.co/rest/v1/collection_items?select=count" \
  -H "apikey: sb_publishable_N2fpPX2oKo7c0s1ArLtvMw_ZtQa4vV8" | jq '.[] | .count' 2>/dev/null || echo "Erreur API"

echo ""
echo "🔒 6. État RLS (collection_items):"
curl -s "https://opktyoxabqxpnhasbipd.supabase.co/rest/v1/collection_items?select=id&limit=1" \
  -H "apikey: sb_publishable_N2fpPX2oKo7c0s1ArLtvMw_ZtQa4vV8" | jq '. | length' 2>/dev/null || echo "0"

echo ""
echo "=========================================="
echo "✅ VÉRIFICATION TERMINÉE"
echo "=========================================="
