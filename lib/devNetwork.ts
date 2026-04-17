import Constants from 'expo-constants';
import * as ExpoLinking from 'expo-linking';
import { Platform } from 'react-native';

const EXPLICIT_DEV_HOST = process.env.EXPO_PUBLIC_DEV_HOST?.trim() || null;

function normalizeCandidateUrl(candidate: string | null | undefined): string | null {
  if (!candidate) return null;

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    return candidate;
  }

  return `http://${candidate}`;
}

function extractHost(candidate: string | null | undefined): string | null {
  const normalized = normalizeCandidateUrl(candidate);
  if (!normalized) return null;

  try {
    return new URL(normalized).hostname || null;
  } catch {
    const match = normalized.match(/^[a-z][a-z0-9+.-]*:\/\/([^/:?#]+)/i);
    return match?.[1] || null;
  }
}

export function getDevelopmentHost(): string | null {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.hostname : null;
  }

  if (EXPLICIT_DEV_HOST) {
    return EXPLICIT_DEV_HOST;
  }

  const constants = Constants as typeof Constants & {
    linkingUri?: string;
    expoConfig?: { hostUri?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
    expoGoConfig?: { debuggerHost?: string };
    manifest?: { debuggerHost?: string };
  };

  const candidates = [
    constants.expoConfig?.hostUri,
    constants.manifest2?.extra?.expoClient?.hostUri,
    constants.expoGoConfig?.debuggerHost,
    constants.manifest?.debuggerHost,
    constants.linkingUri,
    ExpoLinking.createURL('/'),
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  return null;
}

export function resolveDevelopmentUrl(rawUrl: string): string {
  if (Platform.OS === 'web') return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return parsed.toString();
    }

    const host = getDevelopmentHost();
    if (!host) return parsed.toString();

    parsed.hostname = host;
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function getDevelopmentProxyBaseUrl(port: number): string {
  if (typeof window !== 'undefined' && window.location?.origin?.includes('.app.github.dev')) {
    return window.location.origin.replace(/-3000\.app\.github\.dev.*/, `-${port}.app.github.dev`);
  }

  const host = getDevelopmentHost();
  if (host) {
    return `http://${host}:${port}`;
  }

  return `http://localhost:${port}`;
}