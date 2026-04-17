import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export const AUTH_CALLBACK_PATH = '/auth/callback';

export function getAuthRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
  }

  return Linking.createURL(AUTH_CALLBACK_PATH);
}

export function isAuthCallbackUrl(url: string) {
  return url.includes('auth/callback');
}

export function getAuthCallbackParams(url: string) {
  const params = new URLSearchParams();
  const queryIndex = url.indexOf('?');
  const hashIndex = url.indexOf('#');

  if (queryIndex >= 0) {
    const query = url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined);
    const queryParams = new URLSearchParams(query);
    queryParams.forEach((value, key) => params.set(key, value));
  }

  if (hashIndex >= 0) {
    const hash = url.slice(hashIndex + 1);
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => params.set(key, value));
  }

  return params;
}