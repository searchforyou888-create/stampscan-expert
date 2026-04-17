const url = 'https://opktyoxabqxpnhasbipd.supabase.co/rest/v1/collection_items';
const key = 'sb_publishable_N2fpPX2oKo7c0s1ArLtvMw_ZtQa4vV8';

fetch(url, {
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'apikey': key
  }
})
.then(r => r.json())
.then(data => {
  console.log('Total items:', data.length);
  data.forEach((item, i) => {
    console.log(`${i+1}. ${item.name} | type: ${item.type} | user_id: ${item.user_id || 'NULL'}`);
  });
})
.catch(e => console.error(e));
