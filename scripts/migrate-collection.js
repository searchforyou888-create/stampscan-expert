#!/usr/bin/env node
/**
 * Migration : copier les collection_items du Supabase cloud vers le Supabase local.
 * Les items copiés auront user_id = null (mode propriétaire).
 *
 * Usage :  node scripts/migrate-collection.js
 *
 * Pré-requis : Supabase local doit tourner (npx supabase start).
 */

const REMOTE_URL = 'https://opktyoxabqxpnhasbipd.supabase.co';
const REMOTE_KEY = 'sb_publishable_N2fpPX2oKo7c0s1ArLtvMw_ZtQa4vV8';

const LOCAL_URL  = 'http://127.0.0.1:54321';
const LOCAL_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function supabaseSelect(url, key, table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&order=created_at.asc`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) throw new Error(`SELECT ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabaseInsert(url, key, table, rows) {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${await res.text()}`);
  return res.status;
}

async function main() {
  console.log('📦 Récupération des items depuis le cloud...');
  const remoteItems = await supabaseSelect(REMOTE_URL, REMOTE_KEY, 'collection_items');
  console.log(`   → ${remoteItems.length} items trouvés sur le cloud`);

  if (remoteItems.length === 0) {
    console.log('Rien à migrer.');
    return;
  }

  // Adapter les items : user_id = null pour le mode propriétaire local
  const localItems = remoteItems.map((item) => ({
    id: item.id,
    user_id: null,
    type: item.type,
    name: item.name || '',
    description: item.description || '',
    estimated_value_min: item.estimated_value_min ?? 0,
    estimated_value_max: item.estimated_value_max ?? 0,
    estimated_value_currency: item.estimated_value_currency || 'EUR',
    confidence_score: item.confidence_score ?? 0.5,
    historical_info: item.historical_info || '',
    origin_country: item.origin_country || '',
    origin_year: item.origin_year || '',
    image_url: item.image_url || '',
    ai_analysis: item.ai_analysis || '{}',
    notes: item.notes || null,
    created_at: item.created_at,
    updated_at: item.updated_at,
    // Colonnes ajoutées par les migrations suivantes (si présentes)
    ...(item.expert_verification_status != null && { expert_verification_status: item.expert_verification_status }),
    ...(item.expert_verification_requested_at != null && { expert_verification_requested_at: item.expert_verification_requested_at }),
    ...(item.expert_verification_completed_at != null && { expert_verification_completed_at: item.expert_verification_completed_at }),
    ...(item.expert_verification_report != null && { expert_verification_report: item.expert_verification_report }),
    ...(item.guided_condition_grade != null && { guided_condition_grade: item.guided_condition_grade }),
    ...(item.guided_condition_issues != null && { guided_condition_issues: item.guided_condition_issues }),
  }));

  console.log('📥 Insertion dans le Supabase local (service_role)...');
  // Insert par lots de 50
  const BATCH = 50;
  for (let i = 0; i < localItems.length; i += BATCH) {
    const batch = localItems.slice(i, i + BATCH);
    const status = await supabaseInsert(LOCAL_URL, LOCAL_KEY, 'collection_items', batch);
    console.log(`   → Lot ${Math.floor(i / BATCH) + 1}: ${batch.length} items → HTTP ${status}`);
  }

  console.log(`✅ Migration terminée : ${localItems.length} items copiés vers le local.`);
}

main().catch((err) => {
  console.error('❌ Erreur de migration:', err.message);
  process.exit(1);
});
