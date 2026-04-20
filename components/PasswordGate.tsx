import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_CODE = '1808';
const STORAGE_KEY = 'stampscan_auth';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      AsyncStorage.getItem(STORAGE_KEY).then((val) => {
        if (val === 'ok') setAuthenticated(true);
        setChecking(false);
      }).catch(() => setChecking(false));
    } catch {
      setChecking(false);
    }
  }, []);

  const handleSubmit = () => {
    if (code.trim() === ACCESS_CODE) {
      try { AsyncStorage.setItem(STORAGE_KEY, 'ok'); } catch {}
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (checking) return (
    <View style={s.container}>
      <Text style={{ color: '#FFD60A', fontSize: 18 }}>Chargement...</Text>
    </View>
  );
  if (authenticated) return <>{children}</>;

  return (
    <View style={s.container}>
      <View style={s.card}>
        <View style={s.iconWrap}>
          <Ionicons name="lock-closed" size={36} color="#FFD60A" />
        </View>
        <Text style={s.title}>Accès Privé</Text>
        <Text style={s.subtitle}>Entrez le code d'accès pour continuer</Text>

        <TextInput
          style={[s.input, error && s.inputError]}
          placeholder="Code d'accès"
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={code}
          onChangeText={(t) => { setCode(t); setError(false); }}
          onSubmitEditing={handleSubmit}
          secureTextEntry
          autoFocus
        />

        {error && <Text style={s.errorText}>Code incorrect</Text>}

        <TouchableOpacity style={s.button} onPress={handleSubmit} activeOpacity={0.8}>
          <Text style={s.buttonText}>Entrer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0D0D1A', minHeight: '100%' as any },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.2)',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,214,10,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,214,10,0.3)',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#FFD60A', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(207,201,229,0.7)', marginBottom: 24, textAlign: 'center' },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 13, marginBottom: 8 },
  button: {
    width: '100%',
    backgroundColor: '#FFD60A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#0D0D1A', fontSize: 16, fontWeight: '700' },
});
