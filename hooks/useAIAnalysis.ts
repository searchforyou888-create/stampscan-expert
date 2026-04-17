import { useState } from 'react';
import { Platform } from 'react-native';
import { CollectibleType, ScanResult } from '@/types/collection';
import { supabase } from '@/lib/supabase';
import { COLLECTSCAN_BUCKET, createCollectscanSignedUrl } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';

const DIRECT_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

// Max dimension for images sent to Claude (keeps cost low)
const MAX_IMAGE_DIMENSION = 800;
const IMAGE_COMPRESS_QUALITY = 0.7;

/**
 * Compress/resize image before upload to reduce Claude API costs.
 * On native uses expo-image-manipulator, on web uses canvas.
 */
async function compressImage(
  imageUri: string,
  webFile: File | null
): Promise<{ uri: string; file: File | null }> {
  if (Platform.OS !== 'web') {
    try {
      const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
      const result = await manipulateAsync(
        imageUri,
        [{ resize: { width: MAX_IMAGE_DIMENSION } }],
        { compress: IMAGE_COMPRESS_QUALITY, format: SaveFormat.JPEG }
      );
      return { uri: result.uri, file: null };
    } catch (err) {
      console.warn('[CollectScan] Image compression failed, using original:', err);
      return { uri: imageUri, file: webFile };
    }
  }

  // Web: use canvas to resize
  if (webFile) {
    try {
      const compressedFile = await compressWebImage(webFile);
      return { uri: imageUri, file: compressedFile };
    } catch (err) {
      console.warn('[CollectScan] Web image compression failed, using original:', err);
    }
  }
  return { uri: imageUri, file: webFile };
}

function compressWebImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('no canvas context')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('canvas toBlob failed')); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        IMAGE_COMPRESS_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

const TYPE_LABELS: Record<CollectibleType, string> = {
  stamp: 'timbre postal',
  coin: 'pièce de monnaie',
  banknote: 'billet de banque',
  card: 'carte de collection',
  other: 'objet de collection',
};

const FALLBACK_NAMES: Record<CollectibleType, string> = {
  stamp: 'Timbre à identifier',
  coin: 'Pièce à identifier',
  banknote: 'Billet à identifier',
  card: 'Carte à identifier',
  other: 'Objet à identifier',
};

// Appel direct à Claude API (mode bypass/dev uniquement)
async function callClaudeDirectly(imageUrl: string, type: CollectibleType): Promise<Record<string, unknown>> {
  if (!DIRECT_API_KEY) throw new Error('AI_REQUEST_FAILED');
  const typeLabel = TYPE_LABELS[type];
  const prompt = `Analyse ce ${typeLabel} sur la photo. Identifie pays, période, état réel visible, valeur marché actuelle.\n\nRéponds UNIQUEMENT avec ce JSON exact (pas de markdown, pas de backticks) :\n{"type":"${type}","name":"nom complet et précis","description":"description détaillée en 2-4 phrases","estimatedValueMin":0.50,"estimatedValueMax":5.00,"currency":"EUR","confidenceScore":0.85,"historicalInfo":"contexte historique en 3-5 phrases","originCountry":"pays d'origine","originYear":"année ou période","condition":"Neuf|TTB|TB|B|Mauvais état","rarity":"Commun|Peu commun|Rare|Très rare|Exceptionnel","keyFacts":["fait 1","fait 2","fait 3"]}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': DIRECT_API_KEY,
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

  if (!response.ok) {
    if (response.status === 429) throw new Error('AI_QUOTA_EXCEEDED');
    throw new Error('AI_REQUEST_FAILED');
  }

  const data = await response.json();
  let raw = (data?.content?.find((b: any) => b.type === 'text')?.text || '').trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  const s = raw.indexOf('{');
  const e = raw.lastIndexOf('}');
  if (s === -1 || e <= s) throw new Error('AI_INVALID_JSON');
  return JSON.parse(raw.slice(s, e + 1));
}

async function uploadImageToSupabase(
  imageUri: string,
  webFile: File | null
): Promise<{ imageUrl: string; storagePath: string }> {
  // Compress/resize before upload to save Claude API costs
  console.log('[CollectScan] Compressing image...');
  const compressed = await compressImage(imageUri, webFile);
  const finalUri = compressed.uri;
  const finalFile = compressed.file;

  const path = `scans/${Date.now()}.jpg`;

  if (finalFile) {
    // Web: upload File directement
    const { data, error } = await supabase.storage.from(COLLECTSCAN_BUCKET).upload(path, finalFile, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw new Error('UPLOAD_FAILED: ' + error.message);
    const imageUrl = await createCollectscanSignedUrl(data.path);
    return { imageUrl, storagePath: data.path };
  }

  // Mobile: fetch le fichier local → blob → upload
  try {
    const response = await fetch(finalUri);
    const blob = await response.blob();
    const { data, error } = await supabase.storage.from(COLLECTSCAN_BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw new Error('UPLOAD_FAILED: ' + error.message);
    const imageUrl = await createCollectscanSignedUrl(data.path);
    return { imageUrl, storagePath: data.path };
  } catch (err: any) {
    throw new Error('UPLOAD_FAILED: ' + (err?.message || String(err)));
  }
}

async function getFallbackImageUrl(imageUri: string, webFile: File | null): Promise<string> {
  if (!webFile) return imageUri;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : imageUri);
    reader.onerror = () => reject(new Error('FALLBACK_IMAGE_READ_FAILED'));
    reader.readAsDataURL(webFile);
  });
}

async function buildFallbackResult(
  imageUri: string,
  type: CollectibleType,
  webFile: File | null,
  reason: string
): Promise<ScanResult & { imageUrl: string; storagePath: string | null }> {
  const fallbackImageUrl = await getFallbackImageUrl(imageUri, webFile);
  return {
    type,
    name: FALLBACK_NAMES[type],
    description: 'Analyse automatique indisponible pour le moment. La photo a été enregistrée pour une vérification manuelle.',
    estimatedValueMin: 0,
    estimatedValueMax: 0,
    currency: 'EUR',
    confidenceScore: 0.05,
    historicalInfo: `Analyse non disponible actuellement (${reason}).`,
    originCountry: '',
    originYear: '',
    condition: 'A déterminer',
    rarity: 'Commun',
    keyFacts: ['Photo conservée', 'Analyse automatique indisponible', 'Vérification manuelle recommandée'],
    catalogueRef: undefined,
    marketplaces: undefined,
    imageUrl: fallbackImageUrl,
    storagePath: null,
  };
}

export function useAIAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOwnerModeActive } = useAuth();

  const analyze = async (
    imageUri: string,
    type: CollectibleType,
    webFile: File | null
  ): Promise<(ScanResult & { imageUrl: string; storagePath: string | null }) | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Upload image vers Supabase Storage et obtenir URL publique
      console.log('[CollectScan] Uploading image...');
      const { imageUrl, storagePath } = await uploadImageToSupabase(imageUri, webFile);
      console.log('[CollectScan] Image uploaded:', storagePath);

      // 2. Appeler l'IA — Edge Function d'abord, appel direct en mode bypass si indisponible
      let analysisResult: Record<string, unknown>;
      try {
        const { data, error: fnError } = await supabase.functions.invoke('identify-item', {
          body: { imageUrl, type },
        });

        if (fnError) {
          const msg = fnError.message || String(fnError);
          if (msg.includes('QUOTA') || msg.includes('429')) throw new Error('AI_QUOTA_EXCEEDED');
          throw new Error('EDGE_FUNCTION_UNAVAILABLE');
        }

        if (!data?.success || !data?.result) throw new Error('EDGE_FUNCTION_UNAVAILABLE');
        analysisResult = data.result;
      } catch (err: any) {
        const message = err?.message || String(err) || '';
        if (message.includes('AI_QUOTA_EXCEEDED')) throw new Error('AI_QUOTA_EXCEEDED');

        // En mode bypass, on tente l'appel direct à Claude
        if (isOwnerModeActive && DIRECT_API_KEY) {
          console.log('[CollectScan] Edge Function indisponible, appel direct Claude...');
          analysisResult = await callClaudeDirectly(imageUrl, type);
        } else {
          if (message.includes('fetch') || message.includes('Network')) throw new Error('NETWORK_REQUEST_FAILED');
          throw new Error('AI_REQUEST_FAILED');
        }
      }

      const scanResult: ScanResult & { imageUrl: string; storagePath: string | null } = {
        type: (analysisResult.type as CollectibleType) || type,
        name: (analysisResult.name as string) || 'Objet non identifié',
        description: (analysisResult.description as string) || '',
        estimatedValueMin: Number(analysisResult.estimatedValueMin) || 0,
        estimatedValueMax: Number(analysisResult.estimatedValueMax) || 0,
        currency: (analysisResult.currency as string) || 'EUR',
        confidenceScore: Number(analysisResult.confidenceScore) || 0.5,
        historicalInfo: (analysisResult.historicalInfo as string) || '',
        originCountry: (analysisResult.originCountry as string) || '',
        originYear: String(analysisResult.originYear || ''),
        condition: (analysisResult.condition as string) || '',
        rarity: (analysisResult.rarity as string) || 'Commun',
        keyFacts: Array.isArray(analysisResult.keyFacts) ? analysisResult.keyFacts : [],
        catalogueRef: (analysisResult.catalogueRef as string) || undefined,
        marketplaces: (analysisResult.marketplaces as string) || undefined,
        imageUrl,
        storagePath,
      };

      return scanResult;
    } catch (err: any) {
      const message = err?.message || String(err) || 'Analyse échouée';
      console.error('[CollectScan] AI Analysis error:', message);
      setError(message);

      if (
        message.includes('UPLOAD_FAILED') ||
        message === 'AI_QUOTA_EXCEEDED' ||
        message === 'NETWORK_REQUEST_FAILED' ||
        message === 'AI_INVALID_JSON' ||
        message === 'AI_EMPTY_RESPONSE' ||
        message === 'AI_REQUEST_FAILED'
      ) {
        return buildFallbackResult(imageUri, type, webFile, message);
      }

      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { analyze, isLoading, error };
}
