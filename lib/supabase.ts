import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/supabase';
import { Platform } from 'react-native';

function getRequiredEnvVar(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `[Supabase] Variable manquante: ${name}. Ajoutez-la dans votre environnement local avant de lancer l'application.`
    );
  }

  return value;
}

const supabaseUrl = getRequiredEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
