/**
 * Silent anonymous auth — creates a unique throwaway account on first launch.
 * Stores credentials in AsyncStorage and re-signs in automatically.
 * This gives us a valid JWT so AI + Storage endpoints work without visible login.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blink } from '@/lib/blink';

const KEY_EMAIL = 'anon_auth_email';
const KEY_PASSWORD = 'anon_auth_password';

function generateAnonEmail(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `anon_${rand}_${Date.now()}@collectscan.app`;
}

function generateAnonPassword(): string {
  return `Cs!${Math.random().toString(36).slice(2)}${Date.now()}`;
}

export function useAnonymousAuth() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureAuth() {
      try {
        // Already authenticated?
        if (blink.auth.isAuthenticated()) {
          if (!cancelled) setIsReady(true);
          return;
        }

        // Check stored anon credentials
        const storedEmail = await AsyncStorage.getItem(KEY_EMAIL);
        const storedPassword = await AsyncStorage.getItem(KEY_PASSWORD);

        if (storedEmail && storedPassword) {
          // Try to sign back in
          try {
            await blink.auth.signInWithEmail(storedEmail, storedPassword);
            if (!cancelled) setIsReady(true);
            return;
          } catch {
            // Credentials invalid, create new account below
          }
        }

        // Create new anonymous account
        const email = generateAnonEmail();
        const password = generateAnonPassword();

        try {
          await blink.auth.signUp({ email, password });
        } catch (signUpErr: any) {
          // If email already exists, try signing in
          if (signUpErr?.code === 'EMAIL_ALREADY_EXISTS') {
            await blink.auth.signInWithEmail(email, password);
          } else {
            throw signUpErr;
          }
        }

        await AsyncStorage.setItem(KEY_EMAIL, email);
        await AsyncStorage.setItem(KEY_PASSWORD, password);

        if (!cancelled) setIsReady(true);
      } catch (err: any) {
        console.error('Anonymous auth error:', err);
        // Don't block the app — let it proceed, AI will fail gracefully
        if (!cancelled) {
          setError(err?.message || 'Auth failed');
          setIsReady(true);
        }
      }
    }

    ensureAuth();
    return () => { cancelled = true; };
  }, []);

  return { isReady, error };
}
