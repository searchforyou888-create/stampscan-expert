const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://opktyoxabqxpnhasbipd.supabase.co',
  'sb_publishable_N2fpPX2oKo7c0s1ArLtvMw_ZtQa4vV8'
);

async function test() {
  console.log('\n=== Test 1: .is("user_id", null) ===');
  const { data: d1, error: e1 } = await supabase
    .from('collection_items')
    .select('id, name, user_id')
    .is('user_id', null);
  console.log('Result:', d1?.length || 0, 'items');
  if (e1) console.error('Error:', e1);

  console.log('\n=== Test 3: No filter ===');
  const { data: d3, error: e3 } = await supabase
    .from('collection_items')
    .select('id, name, user_id');
  console.log('Result:', d3?.length || 0, 'items');
  if (e3) console.error('Error:', e3);
  d3?.forEach(item => {
    console.log(`  - ${item.name} | user_id: ${item.user_id || 'NULL'}`);
  });
}

test().catch(console.error);
