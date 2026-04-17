import React, { useMemo, useState } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { colors, spacing, borderRadius, shadows, typography } from '@/constants/design';
import { useAuth } from '@/hooks/useAuth';

export default function AuthScreen() {
  const {
    isAuthenticated,
    isOwnerModeAvailable,
    signIn,
    signInWithGoogle,
    signUp,
    enableOwnerMode,
    error,
    notice,
    clearError,
    clearNotice,
    isSubmitting,
  } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const title = useMemo(() => (
    mode === 'signup' ? 'Creer un compte' : 'Se connecter'
  ), [mode]);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const validate = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setLocalError('Entrez une adresse email valide.');
      return false;
    }
    if (password.length < 8) {
      setLocalError('Le mot de passe doit contenir au moins 8 caracteres.');
      return false;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return false;
    }
    setLocalError(null);
    clearError();
    clearNotice();
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (mode === 'signup') {
      await signUp(email, password);
      return;
    }
    await signIn(email, password);
  };

  const switchMode = () => {
    setMode((current) => current === 'signup' ? 'signin' : 'signup');
    setLocalError(null);
    clearError();
    clearNotice();
  };

  return (
    <LinearGradient colors={['#1A1A2E', '#2D2D4E']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={34} color="#FFD60A" />
            </View>
            <Text style={styles.title}>StampScan Expert</Text>
            <Text style={styles.subtitle}>Collection, estimation et historique relies a votre compte.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardText}>Utilisez votre email pour retrouver votre collection sur tous vos appareils.</Text>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="nom@exemple.com"
              keyboardType="email-address"
              autoCapitalize="none"
              clearable
            />

            <View>
              <Input
                label="Mot de passe"
                value={password}
                onChangeText={setPassword}
                placeholder="Au moins 8 caracteres"
                secureTextEntry
              />
              <Text style={styles.fieldHint}>
                <Ionicons name="information-circle-outline" size={12} color={colors.primary} />
                {' '}Minimum 8 caracteres requis
              </Text>
            </View>

            {mode === 'signup' ? (
              <View>
                <Input
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Retapez le mot de passe"
                  secureTextEntry
                />
                <Text style={styles.fieldHint}>
                  <Ionicons name="shield-checkmark-outline" size={12} color={colors.primary} />
                  {' '}Doit etre identique au mot de passe
                </Text>
              </View>
            ) : null}

            {localError || error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.errorLight} />
                <Text style={styles.errorText}>{localError || error}</Text>
              </View>
            ) : null}

            {notice ? (
              <View style={styles.noticeBox}>
                <Ionicons name="mail-open-outline" size={16} color={colors.successDark} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            <Button onPress={signInWithGoogle} loading={isSubmitting} fullWidth variant="outline">
              Continuer avec Google
            </Button>

            <View style={styles.separatorRow}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            <Button onPress={handleSubmit} loading={isSubmitting} fullWidth>
              {mode === 'signup' ? 'Creer mon compte' : 'Me connecter'}
            </Button>

            {isOwnerModeAvailable ? (
              <Button onPress={enableOwnerMode} fullWidth variant="outline">
                Continuer en mode proprietaire
              </Button>
            ) : null}

            <TouchableOpacity onPress={switchMode} style={styles.switchButton} activeOpacity={0.8}>
              <Text style={styles.switchText}>
                {mode === 'signup'
                  ? 'Vous avez deja un compte ? Se connecter'
                  : 'Pas encore de compte ? Creer un compte'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,214,10,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.35)',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.lg,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.secondary,
    marginBottom: 2,
  },
  cardText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFD60A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#D0D0E8',
    textAlign: 'center',
  },
  fieldHint: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorTint,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.errorDark,
    fontSize: 13,
    fontWeight: '600',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successTint,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  noticeText: {
    flex: 1,
    color: colors.successDark,
    fontSize: 13,
    fontWeight: '600',
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: 2,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  switchButton: {
    paddingTop: spacing.xs,
    alignItems: 'center',
  },
  switchText: {
    color: colors.info,
    fontSize: 14,
    fontWeight: '600',
  },
});
