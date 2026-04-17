import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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
  const pulse = useSharedValue(0);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo pulse
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    // Anneaux concentriques
    ring1.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1);
    ring2.value = withDelay(400, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1));
    ring3.value = withDelay(800, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1));
    // Titre
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 700 }));
    // Dots
    dot1.value = withDelay(600, withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1));
    dot2.value = withDelay(800, withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1));
    dot3.value = withDelay(1000, withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.12]) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.7]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.4]) }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring1.value, [0, 0.3, 1], [0.6, 0.4, 0]),
    transform: [{ scale: interpolate(ring1.value, [0, 1], [0.8, 2.2]) }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring2.value, [0, 0.3, 1], [0.6, 0.4, 0]),
    transform: [{ scale: interpolate(ring2.value, [0, 1], [0.8, 2.2]) }],
  }));
  const ring3Style = useAnimatedStyle(() => ({
    opacity: interpolate(ring3.value, [0, 0.3, 1], [0.6, 0.4, 0]),
    transform: [{ scale: interpolate(ring3.value, [0, 1], [0.8, 2.2]) }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: interpolate(titleOpacity.value, [0, 1], [12, 0]) }],
  }));
  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <LinearGradient colors={['#0D0D1A', '#1A1A2E', '#2D2D4E']} style={splash.container}>
      <StatusBar style="light" />

      {/* Anneaux de propagation */}
      <View style={splash.ringsWrap}>
        <Animated.View style={[splash.ring, ring1Style]} />
        <Animated.View style={[splash.ring, ring2Style]} />
        <Animated.View style={[splash.ring, ring3Style]} />
      </View>

      {/* Halo doré */}
      <Animated.View style={[splash.glow, glowStyle]} />

      {/* Logo */}
      <Animated.View style={[splash.logoCircle, logoStyle]}>
        <Ionicons name="shield-checkmark" size={44} color="#FFD60A" />
      </Animated.View>

      {/* Titre + sous-titre */}
      <Animated.View style={[splash.textBlock, titleStyle]}>
        <Text style={splash.appName}>StampScan Expert</Text>
        <Text style={splash.tagline}>Votre collection, partout avec vous</Text>
      </Animated.View>

      {/* Points de chargement */}
      <View style={splash.dotsRow}>
        <Animated.View style={[splash.dot, dot1Style]} />
        <Animated.View style={[splash.dot, dot2Style]} />
        <Animated.View style={[splash.dot, dot3Style]} />
      </View>

      {/* Badge bas de page */}
      <View style={splash.badge}>
        <Ionicons name="scan-outline" size={13} color="rgba(255,214,10,0.7)" />
        <Text style={splash.badgeText}>Analyse IA par Claude</Text>
      </View>
    </LinearGradient>
  );
}

function RootNavigator() {
  const { isReady, error } = useAuth();
  const [minDelayDone, setMinDelayDone] = React.useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 2500);
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

export default function RootLayout() {
  useFrameworkReady();

  return (
    <QueryClientProvider client={queryClient}>
      <PasswordGate>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </PasswordGate>
    </QueryClientProvider>
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
  },
  ringsWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'rgba(255,214,10,0.6)',
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,214,10,0.15)',
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
  textBlock: {
    alignItems: 'center',
    gap: 8,
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
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD60A',
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