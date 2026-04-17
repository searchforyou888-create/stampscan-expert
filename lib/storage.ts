import { supabase } from '@/lib/supabase';

export const COLLECTSCAN_BUCKET = 'collectscan';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

function stripQueryString(value: string): string {
  return value.split('?')[0] || value;
}

function extractCollectscanPath(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  if (trimmedValue.startsWith('data:') || trimmedValue.startsWith('blob:')) return null;

  if (!/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  const markers = [
    `/storage/v1/object/public/${COLLECTSCAN_BUCKET}/`,
    `/storage/v1/object/sign/${COLLECTSCAN_BUCKET}/`,
    `/storage/v1/object/authenticated/${COLLECTSCAN_BUCKET}/`,
  ];

  for (const marker of markers) {
    const markerIndex = trimmedValue.indexOf(marker);
    if (markerIndex !== -1) {
      const pathStart = markerIndex + marker.length;
      return decodeURIComponent(stripQueryString(trimmedValue.slice(pathStart)));
    }
  }

  return null;
}

export async function createCollectscanSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(COLLECTSCAN_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`SIGNED_URL_FAILED: ${error?.message || 'missing signed url'}`);
  }

  return data.signedUrl;
}

export async function resolveStoredImageUrl(value: string | null | undefined): Promise<string> {
  if (!value) return '';

  const collectscanPath = extractCollectscanPath(value);
  if (!collectscanPath) return value;

  return createCollectscanSignedUrl(collectscanPath);
}

export function getCollectscanStoragePath(value: string | null | undefined): string | null {
  return extractCollectscanPath(value);
}