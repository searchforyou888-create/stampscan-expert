
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/supabase';
import { Platform } from 'react-native';

// --- CONFIGURATION DIRECTE ---
// Remplace les liens ci-dessous par tes vrais codes Supabase
const supabaseUrl = "https://opktyoxabqxpnhasbipd.supabase.co";
const supabaseAnonKey = "sb_publishable_N2fpPX2oKo7c0s1ArLtvMw_ZtQa4vV8";
// ------------------------------

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
