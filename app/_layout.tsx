throw new Error('TEST_BUNDLE_ERROR');
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { colors } from '@/constants/design';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import PasswordGate from '@/components/PasswordGate';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function SplashScreen() {
  return (
    <View style={splash.container}>
      <StatusBar style="light" />
      <View style={splash.logoCircle}>
        <Ionicons name="shield-checkmark" size={44} color="#FFD60A" />
      </View>
      <Text style={splash.appName}>StampScan Expert</Text>
      <Text style={splash.tagline}>Votre collection, partout avec vous</Text>
      <ActivityIndicator size="small" color="#FFD60A" style={{ marginTop: 20 }} />
      <View style={splash.badge}>
        <Ionicons name="scan-outline" size={13} color="rgba(255,214,10,0.7)" />
        <Text style={splash.badgeText}>Analyse IA par Claude</Text>
      </View>
    </View>
  );
}

function RootNavigator() {
  const { isReady, error } = useAuth();
  const [minDelayDone, setMinDelayDone] = React.useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!isReady || !minDelayDone) {
    return <SplashScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="result/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      {error ? (
        <View style={styles.errorBanner} pointerEvents="none">
          <Text style={styles.errorText}>Service indisponible. Reessayez dans un instant.</Text>
        </View>
      ) : null}
      <StatusBar style="light" />
    </>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0D0D1A', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Erreur de chargement</Text>
          <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center' }}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PasswordGate>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </PasswordGate>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: '#FEE2E2',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const splash = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#0D0D1A',
    minHeight: '100%' as any,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,214,10,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,214,10,0.4)',
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFD60A',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(207,201,229,0.85)',
    textAlign: 'center',
    fontWeight: '400',
  },
  badge: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.2)',
  },
  badgeText: {
    color: 'rgba(255,214,10,0.75)',
    fontSize: 12,
    fontWeight: '500',
  },
});