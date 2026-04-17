import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { getAuthCallbackParams, getAuthRedirectUrl, isAuthCallbackUrl } from '@/lib/authRedirect';

type AuthUser = {
  id: string;
  email?: string;
  displayName?: string;
  emailVerified: boolean;
} | null;

type AuthContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  user: AuthUser;
  session: Session | null;
  isOwnerModeAvailable: boolean;
  isOwnerModeActive: boolean;
  error: string | null;
  notice: string | null;
  isSubmitting: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<boolean>;
  enableOwnerMode: () => Promise<void>;
  disableOwnerMode: () => Promise<void>;
  isEmailVerified: boolean;
  clearError: () => void;
  clearNotice: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function formatAuthError(error: any): string {
  const message = error?.message || String(error) || 'Erreur de connexion';

  if (message.includes('Email already registered') || message.includes('User already registered')) {
    return 'Un compte existe déjà avec cette adresse email.';
  }
  if (message.includes('Invalid login credentials') || message.includes('invalid credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Votre email n\'est pas encore vérifié. Ouvrez votre boite mail puis cliquez sur le lien de confirmation.';
  }
  if (message.includes('Password should be at least')) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }
  if (message.includes('provider is not enabled') || message.includes('Unsupported provider') || message.includes('not enabled')) {
    return 'Google n\'est pas encore activé dans Supabase. Allez dans votre dashboard Supabase → Authentication → Providers → Google, activez-le et ajoutez vos identifiants Google OAuth.';
  }
  if (message.includes('redirect') || message.includes('callback')) {
    return 'URL de redirection non autorisée. Ajoutez l\'URL de votre app dans Supabase → Authentication → URL Configuration → Redirect URLs.';
  }
  if (message.includes('Network') || message.includes('fetch') || message.includes('Failed to fetch')) {
    return 'Connexion réseau impossible. Vérifiez internet puis réessayez.';
  }
  return message;
}

function mapUser(user: User | null | undefined): AuthUser {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

async function completeNativeAuthFromUrl(url: string) {
  if (Platform.OS === 'web' || !isAuthCallbackUrl(url)) {
    return false;
  }

  const params = getAuthCallbackParams(url);
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const errorDescription = params.get('error_description') || params.get('error');

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return true;
  }

  return false;
}

// ─── Mode propriétaire (bypass auth) ──────────────────────────────────────────
// Only check EXPO_PUBLIC_OWNER_BYPASS env var, ignore NODE_ENV since it's often empty in Expo
const OWNER_BYPASS_ENABLED = process.env.EXPO_PUBLIC_OWNER_BYPASS === 'true';
const OWNER_MODE_STORAGE_KEY = 'collectscan_owner_mode_active';
const OWNER_MOCK_USER: AuthUser = {
  id: 'proprietaire-local-bypass',
  email: 'proprietaire@stampscan.app',
  displayName: 'Propriétaire',
  emailVerified: true,
};

async function loadOwnerModePreference(): Promise<boolean | null> {
  if (!OWNER_BYPASS_ENABLED) return false;

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(OWNER_MODE_STORAGE_KEY);
    if (stored === null) return null;
    return stored === 'true';
  }

  const stored = await AsyncStorage.getItem(OWNER_MODE_STORAGE_KEY);
  if (stored === null) return null;
  return stored === 'true';
}

async function persistOwnerModePreference(isActive: boolean) {
  if (!OWNER_BYPASS_ENABLED) return;

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(OWNER_MODE_STORAGE_KEY, isActive ? 'true' : 'false');
    return;
  }

  await AsyncStorage.setItem(OWNER_MODE_STORAGE_KEY, isActive ? 'true' : 'false');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isOwnerModeActive, setIsOwnerModeActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useMemo(() => {
    if (isOwnerModeActive) return OWNER_MOCK_USER;
    return mapUser(session?.user);
  }, [isOwnerModeActive, session]);

  const isAuthenticated = isOwnerModeActive || Boolean(session?.user);
  const isEmailVerified = isOwnerModeActive || Boolean(session?.user?.email_confirmed_at);

  const enableOwnerMode = useCallback(async () => {
    if (!OWNER_BYPASS_ENABLED) return;
    await persistOwnerModePreference(true);
    setError(null);
    setNotice('Mode propriétaire activé.');
    setIsOwnerModeActive(true);
    setIsReady(true);
  }, []);

  const disableOwnerMode = useCallback(async () => {
    await persistOwnerModePreference(false);
    setIsOwnerModeActive(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const ownerModePreference = await loadOwnerModePreference();
      if (isMounted) {
        // Force Owner Mode if enabled, no preference check needed
        const shouldAutoEnableOwnerMode = OWNER_BYPASS_ENABLED;
        setIsOwnerModeActive(shouldAutoEnableOwnerMode);
        if (shouldAutoEnableOwnerMode) {
          await persistOwnerModePreference(true);
        }
      }

      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const didHandleDeepLink = await completeNativeAuthFromUrl(initialUrl);
          if (didHandleDeepLink && isMounted) {
            setNotice('Email verifie. Connexion terminee.');
          }
        }
      } catch (e) {
        if (isMounted) {
          setError(formatAuthError(e));
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(session);
      setIsReady(true);
    };

    initializeAuth();

    // Écoute les changements d'état auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsReady(true);
    });

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      completeNativeAuthFromUrl(url)
        .then((didHandleDeepLink) => {
          if (didHandleDeepLink) {
            setNotice('Email verifie. Connexion terminee.');
          }
        })
        .catch((e) => {
          setError(formatAuthError(e));
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      return true;
    } catch (e) {
      setError(formatAuthError(e));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getAuthRedirectUrl() },
      });
      if (error) throw error;
      return true;
    } catch (e) {
      setError(formatAuthError(e));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) throw error;
      setNotice('Compte créé. Un email de vérification vient d\'être envoyé.');
      return true;
    } catch (e) {
      setError(formatAuthError(e));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setNotice(null);
    if (isOwnerModeActive) {
      await disableOwnerMode();
      return;
    }
    await supabase.auth.signOut();
  }, [disableOwnerMode, isOwnerModeActive]);

  const sendVerificationEmail = useCallback(async () => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      if (!session?.user?.email) throw new Error('Aucun email associé au compte');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: session.user.email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) throw error;
      setNotice('Email de vérification envoyé. Vérifiez votre boite de réception.');
      return true;
    } catch (e) {
      setError(formatAuthError(e));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [session?.user?.email]);

  return (
    <AuthContext.Provider value={{
      isReady,
      isAuthenticated,
      user,
      session,
      isOwnerModeAvailable: OWNER_BYPASS_ENABLED,
      isOwnerModeActive,
      error,
      notice,
      isSubmitting,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      sendVerificationEmail,
      enableOwnerMode,
      disableOwnerMode,
      isEmailVerified,
      clearError: () => setError(null),
      clearNotice: () => setNotice(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
