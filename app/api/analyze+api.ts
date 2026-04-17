// Route API Expo Router — proxy serveur vers Claude (évite le CORS navigateur)
export async function POST(request: Request): Promise<Response> {
  try {
    const { imageUrl, type } = await request.json() as { imageUrl?: string; type?: string };

    if (!imageUrl || !type) {
      return Response.json({ error: 'imageUrl and type required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const TYPE_LABELS: Record<string, string> = {
      stamp: 'timbre postal',
      coin: 'pièce de monnaie',
      banknote: 'billet de banque',
      card: 'carte de collection',
      other: 'objet de collection',
    };

    const typeLabel = TYPE_LABELS[type] || 'objet de collection';

    const prompt = `Analyse ce ${typeLabel} sur la photo. Identifie pays, période, état réel visible, valeur marché actuelle.\n\nRéponds UNIQUEMENT avec ce JSON exact (pas de markdown, pas de backticks) :\n{"type":"${type}","name":"nom complet et précis","description":"description détaillée en 2-4 phrases","estimatedValueMin":0.50,"estimatedValueMax":5.00,"currency":"EUR","confidenceScore":0.85,"historicalInfo":"contexte historique en 3-5 phrases","originCountry":"pays d'origine","originYear":"année ou période","condition":"Neuf|TTB|TB|B|Mauvais état","rarity":"Commun|Peu commun|Rare|Très rare|Exceptionnel","keyFacts":["fait 1","fait 2","fait 3"]}`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2048,
        system: `Tu es un expert philatéliste, numismate et spécialiste mondial des objets de collection avec 30 ans d'expérience. Tu analyses des photos et fournis des estimations PRÉCISES basées sur le marché réel (eBay, Delcampe, NGC, PCGS, maisons d'enchères). Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks. Réponds toujours en français.`,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: imageUrl } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      if (claudeResponse.status === 429) {
        return Response.json({ error: 'AI_QUOTA_EXCEEDED' }, { status: 429 });
      }
      const errText = await claudeResponse.text();
      return Response.json({ error: `CLAUDE_ERROR_${claudeResponse.status}` }, { status: 502 });
    }

    const data = await claudeResponse.json() as { content: { type: string; text: string }[] };
    let raw = (data?.content?.find((b) => b.type === 'text')?.text || '').trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    if (s === -1 || e <= s) {
      return Response.json({ error: 'AI_INVALID_JSON' }, { status: 502 });
    }
    const result = JSON.parse(raw.slice(s, e + 1));

    return Response.json({ success: true, result });
  } catch (err: any) {
    console.error('[API /analyze] Error:', err?.message);
    return Response.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
