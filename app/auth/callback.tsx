import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '@/constants/design';
import { useAuth } from '@/hooks/useAuth';

export default function AuthCallbackScreen() {
  const { isReady, isAuthenticated, error } = useAuth();

  if (isReady && isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  if (isReady && !isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <LinearGradient colors={['#1A1A2E', '#2D2D4E']} style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.title}>Confirmation du compte</Text>
        <Text style={styles.text}>
          {error || 'Connexion en cours apres validation de votre email...'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.secondary,
    textAlign: 'center',
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});