import { useState } from 'react';
import { Platform } from 'react-native';
import { blink } from '@/lib/blink';
import { CollectibleType, ScanResult } from '@/types/collection';

const TYPE_LABELS: Record<CollectibleType, string> = {
  stamp: 'timbre postal',
  coin: 'pièce de monnaie',
  banknote: 'billet de banque',
  card: 'carte de collection (sportive, Pokémon, etc.)',
  other: 'objet de collection',
};

/** Wait for anonymous auth JWT — fast poll, 4s max */
async function waitForAuth(maxWaitMs = 4000): Promise<void> {
  if (blink.auth.isAuthenticated()) return;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 100));
    if (blink.auth.isAuthenticated()) return;
  }
  console.warn('[CollectScan] Auth not ready after wait');
}

/** Upload a file to Blink Storage, returns a public HTTPS URL ending with .ext */
async function uploadImage(imageUri: string, webFile: File | null): Promise<string> {
  if (Platform.OS === 'web' && webFile) {
    const ext = webFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const { publicUrl } = await blink.storage.upload(
      webFile,
      `collectscan/${Date.now()}.${ext}`
    );
    return publicUrl;
  }

  if (Platform.OS !== 'web') {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const file = new File([blob], `scan_${Date.now()}.jpg`, {
      type: blob.type || 'image/jpeg',
    });
    const { publicUrl } = await blink.storage.upload(
      file,
      `collectscan/${Date.now()}.jpg`
    );
    return publicUrl;
  }

  return imageUri;
}

const SYSTEM_PROMPT = `Tu es un expert philatéliste, numismate et spécialiste mondial des objets de collection avec 30 ans d'expérience.
Tu analyses des photos et fournis des estimations PRÉCISES basées sur le marché réel (eBay, Delcampe, NGC, PCGS, maisons d'enchères).
Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après le JSON.
Pour les valeurs : sois réaliste, base-toi sur l'état visible. Si tu ne peux pas identifier précisément l'objet, donne une fourchette large et un confidenceScore bas.`;

function buildUserPrompt(typeLabel: string): string {
  return `Analyse ce ${typeLabel} sur la photo. Identifie pays, période, état réel visible, valeur marché actuelle.

Réponds UNIQUEMENT avec ce JSON exact (pas de markdown, pas de backticks) :
{
  "type": "stamp|coin|banknote|card|other",
  "name": "nom complet et précis de l'objet",
  "description": "description détaillée en 2-4 phrases",
  "estimatedValueMin": 0.50,
  "estimatedValueMax": 5.00,
  "currency": "EUR",
  "confidenceScore": 0.85,
  "historicalInfo": "contexte historique en 3-5 phrases",
  "originCountry": "pays d'origine",
  "originYear": "année ou période",
  "condition": "Neuf|TTB|TB|B|Mauvais état",
  "rarity": "Commun|Peu commun|Rare|Très rare|Exceptionnel",
  "keyFacts": ["fait 1", "fait 2", "fait 3"]
}`;
}

export function useAIAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (
    imageUri: string,
    type: CollectibleType,
    webFile: File | null
  ): Promise<(ScanResult & { publicUrl: string }) | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Wait for anonymous auth JWT
      await waitForAuth(8000);

      // 2. Upload image → permanent public HTTPS URL with extension
      console.log('[CollectScan] Starting image upload...');
      const publicUrl = await uploadImage(imageUri, webFile);
      console.log('[CollectScan] Image uploaded:', publicUrl);

      // 3. Call AI vision via generateText (supports messages + image)
      const typeLabel = TYPE_LABELS[type] || 'objet de collection';
      const response = await blink.ai.generateText({
        model: 'google/gemini-3-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: buildUserPrompt(typeLabel) },
              { type: 'image', image: publicUrl },
            ],
          },
        ],
      });

      // 4. Extract text from response
      const rawText = response?.text ?? '';

      if (!rawText) {
        throw new Error('L\'IA n\'a pas retourné de réponse');
      }

      // 5. Parse JSON — strip any markdown wrappers
      let cleaned = rawText.trim();
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

      const object = JSON.parse(cleaned) as Record<string, any>;

      // 6. Build validated result with defaults
      const result: ScanResult & { publicUrl: string } = {
        type: object.type || type,
        name: object.name || 'Objet non identifié',
        description: object.description || '',
        estimatedValueMin: Number(object.estimatedValueMin) || 0,
        estimatedValueMax: Number(object.estimatedValueMax) || 0,
        currency: object.currency || 'EUR',
        confidenceScore: Number(object.confidenceScore) || 0.5,
        historicalInfo: object.historicalInfo || '',
        originCountry: object.originCountry || '',
        originYear: String(object.originYear || ''),
        condition: object.condition || '',
        rarity: object.rarity || 'Commun',
        keyFacts: Array.isArray(object.keyFacts) ? object.keyFacts : [],
        publicUrl,
      };

      return result;
    } catch (err: any) {
      console.error('[CollectScan] AI Analysis error:', err?.message || err);
      console.error('[CollectScan] Error details:', JSON.stringify({
        message: err?.message,
        status: err?.status,
        code: err?.code,
        details: err?.details,
      }));
      setError(err?.message || 'Analyse échouée');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { analyze, isLoading, error };
}
