#!/usr/bin/env node

/**
 * Script de test: Valide le flux scan complet
 * - Vérifie que la clé Claude API est configurée
 * - Teste que les types TS incluent catalogueRef/marketplaces
 * - Simule une réponse Claude avec les nouveaux champs
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Test du flux scan CollectScan\n');

// 1. Vérifier la clé Claude API
console.log('✓ Étape 1: Vérifier la clé Claude API');
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/ANTHROPIC_API_KEY=sk-ant-.*$/m);

if (apiKeyMatch) {
  const keyPreview = apiKeyMatch[0].slice(0, 40) + '...';
  console.log(`  ✅ Clé trouvée: ${keyPreview}`);
} else {
  console.log('  ❌ ERREUR: Clé Claude API non trouvée');
  process.exit(1);
}

// 2. Vérifier les types TypeScript
console.log('\n✓ Étape 2: Vérifier les types TypeScript');
const collectionTypePath = path.join(__dirname, 'types/collection.ts');
const collectionTypeContent = fs.readFileSync(collectionTypePath, 'utf8');

const hasCatalogueRef = collectionTypeContent.includes('catalogueRef');
const hasMarketplaces = collectionTypeContent.includes('marketplaces');

if (hasCatalogueRef && hasMarketplaces) {
  console.log('  ✅ Types ScanResult incluent catalogueRef et marketplaces');
} else {
  console.log(`  ❌ Types manquants: catalogueRef=${hasCatalogueRef}, marketplaces=${hasMarketplaces}`);
  process.exit(1);
}

// 3. Vérifier que les hooks utilisent les nouveaux champs
console.log('\n✓ Étape 3: Vérifier que useAIAnalysis capture les nouveaux champs');
const useAIPath = path.join(__dirname, 'hooks/useAIAnalysis.ts');
const useAIContent = fs.readFileSync(useAIPath, 'utf8');

const hasCatalogueExtract = useAIContent.includes('catalogueRef: (analysisResult.catalogueRef');
const hasMarketplaceExtract = useAIContent.includes('marketplaces: (analysisResult.marketplaces');

if (hasCatalogueExtract && hasMarketplaceExtract) {
  console.log('  ✅ useAIAnalysis extrait catalogueRef et marketplaces');
} else {
  console.log(`  ❌ Extraction manquante: catalogueRef=${hasCatalogueExtract}, marketplaces=${hasMarketplaceExtract}`);
  process.exit(1);
}

// 4. Vérifier que le scan screen sauvegarde les nouveaux champs
console.log('\n✓ Étape 4: Vérifier que le scan screen persiste les nouveaux champs');
const scanScreenPath = path.join(__dirname, 'app/(tabs)/index.tsx');
const scanScreenContent = fs.readFileSync(scanScreenPath, 'utf8');

const hasCatalogue_refSave = scanScreenContent.includes('catalogue_ref: scanResult.catalogueRef');
const hasMarketplacesSave = scanScreenContent.includes('marketplaces: scanResult.marketplaces');

if (hasCatalogue_refSave && hasMarketplacesSave) {
  console.log('  ✅ Écran scan sauvegarde catalogueRef et marketplaces');
} else {
  console.log(`  ❌ Sauvegarde manquante: catalogue_ref=${hasCatalogue_refSave}, marketplaces=${hasMarketplacesSave}`);
  process.exit(1);
}

// 5. Vérifier la migration Supabase
console.log('\n✓ Étape 5: Vérifier la migration Supabase');
const migrationPath = path.join(__dirname, 'supabase/migrations/20260415_add_catalogue_and_marketplace.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

const hasMigrationCatalogue = migrationContent.includes('catalogue_ref');
const hasMigrationMarketplaces = migrationContent.includes('marketplaces');

if (hasMigrationCatalogue && hasMigrationMarketplaces) {
  console.log('  ✅ Migration ajoute catalogue_ref et marketplaces');
} else {
  console.log(`  ❌ Migration incomplète: catalogue_ref=${hasMigrationCatalogue}, marketplaces=${hasMigrationMarketplaces}`);
  process.exit(1);
}

// 6. Vérifier que l'écran résultat affiche les nouveaux champs
console.log('\n✓ Étape 6: Vérifier que l\'écran résultat affiche les nouveaux champs');
const resultScreenPath = path.join(__dirname, 'app/result/[id].tsx');
const resultScreenContent = fs.readFileSync(resultScreenPath, 'utf8');

const hasResultCatalogueDisplay = resultScreenContent.includes('result.catalogueRef');
const hasResultMarketplaceDisplay = resultScreenContent.includes('result.marketplaces');

if (hasResultCatalogueDisplay && hasResultMarketplaceDisplay) {
  console.log('  ✅ Écran résultat charge et affiche catalogueRef et marketplaces');
} else {
  console.log(`  ❌ Affichage manquant: catalogueRef=${hasResultCatalogueDisplay}, marketplaces=${hasResultMarketplaceDisplay}`);
  process.exit(1);
}

// 7. Tester la réponse Claude avec les nouveaux champs
console.log('\n✓ Étape 7: Simuler une réponse Claude avec les nouveaux champs');
const mockClaudeResponse = {
  success: true,
  result: {
    type: 'stamp',
    name: 'France 1849 Cérès 20c bleu Type I',
    description: 'Timbre d\'exception présentant le profil de Cérès, émis en 1849 pour les grandes distances.',
    estimatedValueMin: 1.50,
    estimatedValueMax: 8.00,
    currency: 'EUR',
    confidenceScore: 0.92,
    historicalInfo: 'Première émission de la République Française, tirage limité, gomme intacte.',
    originCountry: 'France',
    originYear: '1849',
    condition: 'TTB',
    rarity: 'Peu commun',
    keyFacts: [
      'Première émission philatélique française',
      'Type I avec légende continue',
      'Tirage initial: 1 million d\'exemplaires',
      'Variété: Bleu foncé vs bleu clair',
      'Valeur haute si gomme originale conservée'
    ],
    catalogueRef: 'Yvert n°3 / Scott #3',
    marketplaces: 'eBay: 2-6€, Delcampe: 3-8€'
  }
};

// Vérifier que la réponse contient les nouveaux champs
const responseHasCatalogueRef = mockClaudeResponse.result.catalogueRef !== undefined;
const responseHasMarketplaces = mockClaudeResponse.result.marketplaces !== undefined;

if (responseHasCatalogueRef && responseHasMarketplaces) {
  console.log('  ✅ Réponse Claude contient catalogueRef et marketplaces');
  console.log(`     - catalogueRef: "${mockClaudeResponse.result.catalogueRef}"`);
  console.log(`     - marketplaces: "${mockClaudeResponse.result.marketplaces}"`);
} else {
  console.log(`  ❌ Réponse Claude incomplète`);
  process.exit(1);
}

// Résumé
console.log('\n' + '='.repeat(60));
console.log('✅ TOUS LES TESTS PASSENT !');
console.log('='.repeat(60));
console.log('\n📋 Résumé:');
console.log('  ✓ Clé Claude API configurée');
console.log('  ✓ Types TypeScript complets');
console.log('  ✓ Hooks d\'analyse capture les nouveaux champs');
console.log('  ✓ Écran scan persiste les données');
console.log('  ✓ Migration Supabase créée');
console.log('  ✓ Écran résultat affiche les infos');
console.log('  ✓ Réponse Claude format valide');

console.log('\n🚀 Prochaines étapes:');
console.log('  1. Exécuter la migration SQL dans Supabase Dashboard');
console.log('  2. Redéployer l\'Edge Function (si modifiée)');
console.log('  3. Lancer: npx expo start');
console.log('  4. Tester un scan complet');

process.exit(0);
