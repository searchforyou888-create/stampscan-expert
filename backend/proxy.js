#!/usr/bin/env node
// Proxy Expert — Claude + Wikipedia enrichment — CollectScan
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Charger le .env ──────────────────────────────────────────────────────────
function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}
loadDotEnv();

const PORT = process.env.PROXY_PORT || 3001;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const TYPE_LABELS = {
  stamp: 'timbre postal', coin: 'pièce de monnaie',
  banknote: 'billet de banque', card: 'carte de collection', other: 'objet de collection',
};

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

// ─── Téléchargement image → base64 ────────────────────────────────────────────
function fetchImageAsBase64(url, redirectCount = 0) {
  // data: URI déjà en base64 — extraction directe
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',');
    if (comma === -1) return Promise.reject(new Error('INVALID_DATA_URI'));
    const header = url.slice(5, comma); // ex: "image/jpeg;base64"
    const base64 = url.slice(comma + 1);
    const contentType = header.replace(';base64', '') || 'image/jpeg';
    return Promise.resolve({ base64, contentType });
  }

  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('TOO_MANY_REDIRECTS'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 CollectScan/2.0 (educational; contact@collectscan.app)',
        'Accept': 'image/*,*/*',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.resume();
        return fetchImageAsBase64(loc, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`IMAGE_FETCH_${res.statusCode}`));
      }
      const contentType = (res.headers['content-type'] || 'image/jpeg').split(';')[0].trim();
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ base64: Buffer.concat(chunks).toString('base64'), contentType }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('IMAGE_TIMEOUT')); });
  });
}

// ─── Recherche Wikipedia (FR puis EN) ─────────────────────────────────────────
function httpsGet(hostname, path) {
  return new Promise((resolve) => {
    const req = https.get(
      { hostname, path, headers: { 'User-Agent': 'CollectScan/2.0 (educational)' } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
        res.on('error', () => resolve(null));
      }
    );
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

async function searchWikipedia(query, lang = 'fr') {
  try {
    const encoded = encodeURIComponent(query);
    const searchData = await httpsGet(
      `${lang}.wikipedia.org`,
      `/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&srlimit=1&utf8=`
    );
    if (!searchData) return null;
    const json = JSON.parse(searchData);
    const title = json?.query?.search?.[0]?.title;
    if (!title) return null;

    const summaryData = await httpsGet(
      `${lang}.wikipedia.org`,
      `/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!summaryData) return null;
    const page = JSON.parse(summaryData);
    if (!page.extract || page.extract.length < 50) return null;
    return {
      title: page.title,
      extract: page.extract.slice(0, 800),
      url: page.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch {
    return null;
  }
}

async function getWikipediaContext(name, originCountry, originYear, type) {
  const queries = [
    `${name} ${originCountry}`,
    name,
    `${type === 'stamp' ? 'timbre' : type === 'coin' ? 'pièce monnaie' : ''} ${originCountry} ${originYear}`,
  ].filter(Boolean);

  for (const q of queries) {
    const result = await searchWikipedia(q, 'fr');
    if (result) return result;
    const resultEn = await searchWikipedia(q, 'en');
    if (resultEn) return resultEn;
  }
  return null;
}

// ─── Appel Claude expert ───────────────────────────────────────────────────────
function claudeRequest(body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(55000, () => { req.destroy(); reject(new Error('CLAUDE_TIMEOUT')); });
    req.write(bodyStr);
    req.end();
  });
}

function parseClaudeJSON(raw) {
  let cleaned = raw.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  const s = cleaned.indexOf('{');
  const e = cleaned.lastIndexOf('}');
  if (s === -1 || e <= s) throw new Error('AI_INVALID_JSON');
  return JSON.parse(cleaned.slice(s, e + 1));
}

async function analyzeWithClaude(imageUrl, type) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const typeLabel = TYPE_LABELS[type] || 'objet de collection';

  // 1. Télécharger l'image en base64
  let imageSource;
  try {
    const { base64, contentType } = await fetchImageAsBase64(imageUrl);
    console.log(`[proxy] Image OK: ${Math.round(base64.length * 0.75 / 1024)} KB, ${contentType}`);
    imageSource = { type: 'base64', media_type: contentType, data: base64 };
  } catch (e) {
    console.warn('[proxy] Image download failed:', e.message);
    imageSource = { type: 'url', url: imageUrl };
  }

  // 2. Appel Claude — identification + analyse expert complète
  const systemPrompt = `Tu es un expert philatéliste et numismate de renommée mondiale avec 40 ans d'expérience. Tu as expertisé des collections pour Christie's, Sotheby's, Heritage Auctions. Tu utilises les catalogues Stanley Gibbons, Scott, Yvert & Tellier (philatélie) et NGC, PCGS, KrauseWorld Coins (numismatique).

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT en JSON valide, JAMAIS de texte avant ou après
- Valeurs marchées basées sur l'ÉTAT VISIBLE (pas sur la cote catalogue)
- Sois précis sur la variété, le millésime, la valeur faciale
- Historique riche et factuel en 5-7 phrases minimum
- Points clés : au moins 5 faits précis et uniques à cet objet`;

  const userPrompt = `Examine attentivement cette photo de ${typeLabel}. Analyse l'état visible (centrage, gomme, oblitération, défauts), identifie le pays, l'émission exacte, la variété si visible, et estime la valeur marché réelle en 2026.

Réponds UNIQUEMENT avec ce JSON (sans markdown, sans backticks) :
{
  "type": "${type}",
  "name": "nom officiel complet et précis (ex: France 1849 Cérès 20c bleu Type I)",
  "description": "description experte détaillée de l'apparence et de l'état en 3-5 phrases",
  "estimatedValueMin": 1.50,
  "estimatedValueMax": 8.00,
  "currency": "EUR",
  "confidenceScore": 0.92,
  "historicalInfo": "contexte historique très riche : émission, contexte politique, anecdotes, usage postal, tirage... en 5-7 phrases",
  "originCountry": "France",
  "originYear": "1849",
  "condition": "TTB",
  "rarity": "Peu commun",
  "catalogueRef": "Yvert n°3 / Scott #3",
  "keyFacts": [
    "Fait précis 1",
    "Fait précis 2",
    "Fait précis 3",
    "Fait précis 4",
    "Fait précis 5"
  ],
  "marketplaces": "eBay: 2-6€, Delcampe: 3-8€"
}`;

  const res1 = await claudeRequest({
    model: 'claude-opus-4-5',
    max_tokens: 3000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: imageSource },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
  });

  if (res1.status === 429) throw new Error('AI_QUOTA_EXCEEDED');
  if (res1.status !== 200) {
    console.error('[proxy] Claude error', res1.status, ':', res1.body.slice(0, 200));
    throw new Error(`CLAUDE_ERROR_${res1.status}`);
  }

  const parsed1 = JSON.parse(res1.body);
  const rawText = parsed1?.content?.find((b) => b.type === 'text')?.text || '';
  const result = parseClaudeJSON(rawText);
  console.log(`[proxy] Claude OK: "${result.name}", confiance ${result.confidenceScore}`);

  // 3. Enrichissement Wikipedia (en parallèle, non-bloquant)
  try {
    const wiki = await getWikipediaContext(
      result.name || '',
      result.originCountry || '',
      result.originYear || '',
      type
    );
    if (wiki) {
      console.log(`[proxy] Wikipedia: "${wiki.title}"`);
      result.historicalInfo = (result.historicalInfo || '') +
        `\n\n📚 Source Wikipedia — ${wiki.title} : ${wiki.extract}`;
      result.wikiSource = wiki.url;
    }
  } catch (e) {
    console.warn('[proxy] Wikipedia enrichment failed:', e.message);
  }

  return result;
}

// ─── Serveur HTTP ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJSON(res, 200, { ok: true, port: PORT, apiKey: !!ANTHROPIC_KEY });
  }

  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { imageUrl, type } = JSON.parse(body);
        if (!imageUrl || !type) return sendJSON(res, 400, { error: 'imageUrl and type required' });
        console.log(`[proxy] === Analyse ${type}: ${imageUrl.slice(0, 70)}...`);
        const result = await analyzeWithClaude(imageUrl, type);
        console.log(`[proxy] === OK: ${result.name}`);
        sendJSON(res, 200, { success: true, result });
      } catch (err) {
        console.error('[proxy] === ERREUR:', err.message);
        const status = err.message.includes('QUOTA') ? 429 : 500;
        sendJSON(res, status, { error: err.message });
      }
    });
    return;
  }

  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n[proxy] ✓ Expert Claude proxy — port ${PORT}`);
  console.log(`[proxy] ✓ API key: ${ANTHROPIC_KEY ? `${ANTHROPIC_KEY.slice(0, 12)}***` : 'MANQUANTE!'}`);
  console.log(`[proxy] ✓ Wikipedia enrichment: activé\n`);
});
