import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { useScanCounter } from '@/hooks/useScanCounter';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useAuth } from '@/hooks/useAuth';

const PACKAGE_THEMES: Record<string, { color: string; popular: boolean; period: string; features: string[] }> = {
  MONTHLY: {
    color: '#3B6FE8',
    popular: false,
    period: '/mois',
    features: ['Scans illimites', 'Catalogue illimite', 'Estimations avancees'],
  },
  ANNUAL: {
    color: '#C8973A',
    popular: true,
    period: '/an',
    features: ['Scans illimites', 'Catalogue illimite', 'Prix reduit sur l annee'],
  },
  LIFETIME: {
    color: '#8B5CF6',
    popular: false,
    period: ' une fois',
    features: ['Acces premium complet', 'Paiement unique', 'Mises a jour futures'],
  },
};

function getPackageTheme(packageType: string) {
  return PACKAGE_THEMES[packageType] || {
    color: colors.primary,
    popular: false,
    period: '',
    features: ['Acces premium complet', 'Scans illimites', 'Catalogue illimite'],
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { scansUsed, scansRemaining, FREE_SCANS_LIMIT, isOwnerModeActive } = useScanCounter();
  const {
    isPremium,
    packages,
    purchase,
    restore,
    isLoading: rcLoading,
    error: paymentError,
    clearError: clearPaymentError,
  } = useRevenueCat();
  const { user, signOut, sendVerificationEmail, isEmailVerified, notice, error, clearError, clearNotice, isSubmitting } = useAuth();

  const availablePlans = packages.map((pkg) => {
    const theme = getPackageTheme(pkg.packageType);

    return {
      id: pkg.identifier,
      name: pkg.product.title || pkg.identifier,
      price: pkg.product.priceString,
      period: theme.period,
      color: theme.color,
      features: theme.features,
      popular: theme.popular,
      pkg,
    };
  });

  const pct = Math.min(1, scansUsed / FREE_SCANS_LIMIT);
  const barColor = pct >= 0.9 ? '#EF4444' : pct >= 0.6 ? '#F59E0B' : colors.primary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Ionicons name="person-circle" size={28} color={colors.primary} />
          </View>
          <View style={styles.accountBody}>
            <Text style={styles.accountLabel}>Compte</Text>
            <Text style={styles.accountEmail}>{user?.email || 'Utilisateur connecte'}</Text>
            <View style={[styles.verifyBadge, isEmailVerified ? styles.verifyBadgeOk : styles.verifyBadgePending]}>
              <Ionicons
                name={isEmailVerified ? 'checkmark-circle' : 'mail-unread-outline'}
                size={14}
                color={isEmailVerified ? colors.successDark : colors.warningDark}
              />
              <Text style={[styles.verifyBadgeText, isEmailVerified ? styles.verifyBadgeTextOk : styles.verifyBadgeTextPending]}>
                {isEmailVerified ? 'Email verifie' : 'Email non verifie'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.85}
            onPress={async () => {
              await signOut();
              queryClient.clear();
              router.replace('/');
            }}
          >
            <Ionicons name="log-out-outline" size={16} color={colors.errorDark} />
            <Text style={styles.logoutText}>Deconnexion</Text>
          </TouchableOpacity>
        </View>

        {!isEmailVerified ? (
          <View style={styles.verifyCard}>
            <Text style={styles.verifyTitle}>Verification d email</Text>
            <Text style={styles.verifyText}>
              Validez votre adresse email pour securiser votre compte et faciliter la recuperation d acces.
            </Text>
            <TouchableOpacity
              style={[styles.verifyButton, isSubmitting && { opacity: 0.6 }]}
              activeOpacity={0.85}
              disabled={isSubmitting}
              onPress={async () => {
                clearError();
                clearNotice();
                await sendVerificationEmail();
              }}
            >
              <Ionicons name="send-outline" size={16} color="#FFF" />
              <Text style={styles.verifyButtonText}>Renvoyer l email</Text>
            </TouchableOpacity>
            {notice ? <Text style={styles.verifySuccess}>{notice}</Text> : null}
            {error ? <Text style={styles.verifyError}>{error}</Text> : null}
          </View>
        ) : null}

        {/* Free scan counter */}
        {!isPremium && (
          <View style={styles.counterCard}>
            <LinearGradient colors={['#1A1A2E', '#2D2D4E']} style={styles.counterGradient}>
              <View style={styles.counterTop}>
                <View>
                  <Text style={styles.counterLabel}>{isOwnerModeActive ? 'Scans proprietaire restants' : 'Scans gratuits restants'}</Text>
                  <Text style={styles.counterValue}>
                    <Text style={styles.counterBig}>{scansRemaining}</Text>
                    <Text style={styles.counterTotal}> / {FREE_SCANS_LIMIT}</Text>
                  </Text>
                </View>
                <View style={styles.counterIcon}>
                  <Ionicons name="scan" size={28} color={barColor} />
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
              </View>

              {scansRemaining === 0 ? (
                <Text style={styles.counterWarning}>
                  {isOwnerModeActive
                    ? 'Vous avez utilisé tout votre quota proprietaire sur cet appareil.'
                    : '⚠️ Vous avez utilisé tous vos scans gratuits. Passez à un plan payant.'}
                </Text>
              ) : scansRemaining <= 3 ? (
                <Text style={styles.counterWarning}>
                  {isOwnerModeActive
                    ? `Plus que ${scansRemaining} scan${scansRemaining > 1 ? 's' : ''} proprietaire${scansRemaining > 1 ? 's' : ''} !`
                    : `Plus que ${scansRemaining} scan${scansRemaining > 1 ? 's' : ''} gratuit${scansRemaining > 1 ? 's' : ''} !`}
                </Text>
              ) : (
                <Text style={styles.counterHint}>
                  {scansUsed} scan{scansUsed !== 1 ? 's' : ''} effectué{scansUsed !== 1 ? 's' : ''}
                </Text>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Passer au Premium</Text>
          <Text style={styles.sectionSubtitle}>Debloquez tous les scans et fonctionnalites avancees</Text>

          {paymentError ? (
            <View style={styles.paymentMessageCard}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.errorDark} />
              <View style={styles.paymentMessageBody}>
                <Text style={styles.paymentMessageTitle}>Paiements indisponibles</Text>
                <Text style={styles.paymentMessageText}>{paymentError}</Text>
              </View>
            </View>
          ) : null}

          {!rcLoading && !paymentError && availablePlans.length === 0 ? (
            <View style={styles.paymentMessageCard}>
              <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
              <View style={styles.paymentMessageBody}>
                <Text style={styles.paymentMessageTitle}>Aucune offre active</Text>
                <Text style={styles.paymentMessageText}>
                  Ajoutez au moins une offering active dans RevenueCat pour afficher les abonnements ici.
                </Text>
              </View>
            </View>
          ) : null}

          {availablePlans.map((plan) => (
            <View key={plan.id} style={[styles.planCard, plan.popular && styles.planCardPopular]}>
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Populaire</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <View style={[styles.planDot, { backgroundColor: plan.color }]} />
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.planPriceWrap}>
                  <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </View>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={15} color={plan.color} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.planBtn, { backgroundColor: plan.color, opacity: rcLoading ? 0.6 : 1 }]}
                activeOpacity={0.85}
                disabled={rcLoading || isPremium}
                onPress={async () => {
                  clearPaymentError();
                  await purchase(plan.pkg);
                }}
              >
                <Text style={styles.planBtnText}>
                  {isPremium ? '✓ Actif' : `Choisir ${plan.name}`}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={async () => {
            clearPaymentError();
            await restore();
          }}
          disabled={rcLoading}
        >
          <Text style={styles.restoreText}>Restaurer mes achats</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Les offres affichees proviennent directement de RevenueCat pour le compte connecte. Sur web comme sur mobile, seules les offres actives seront proposees.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 100 },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.secondary },

  accountCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  accountBody: {
    flex: 1,
  },
  accountLabel: {
    ...typography.small,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  accountEmail: {
    ...typography.bodyBold,
    color: colors.secondary,
    marginTop: 2,
  },
  verifyBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  verifyBadgeOk: {
    backgroundColor: colors.successTint,
  },
  verifyBadgePending: {
    backgroundColor: colors.warningTint,
  },
  verifyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  verifyBadgeTextOk: {
    color: colors.successDark,
  },
  verifyBadgeTextPending: {
    color: colors.warningDark,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorTint,
  },
  logoutText: {
    color: colors.errorDark,
    fontSize: 12,
    fontWeight: '700',
  },

  verifyCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: '#FFF',
    ...shadows.sm,
  },
  verifyTitle: {
    ...typography.h4,
    color: colors.secondary,
  },
  verifyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  verifyButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.info,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  verifySuccess: {
    marginTop: spacing.sm,
    color: colors.successDark,
    fontSize: 13,
    fontWeight: '600',
  },
  verifyError: {
    marginTop: spacing.sm,
    color: colors.errorDark,
    fontSize: 13,
    fontWeight: '600',
  },

  counterCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.md,
  },
  counterGradient: { padding: spacing.lg },
  counterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  counterLabel: { ...typography.caption, color: '#8B7E9E', textTransform: 'uppercase', letterSpacing: 1 },
  counterValue: { marginTop: 4 },
  counterBig: { fontSize: 40, fontWeight: '800', color: '#E8B86D' },
  counterTotal: { fontSize: 18, color: '#8B7E9E' },
  counterIcon: {
    width: 56, height: 56, borderRadius: borderRadius.full,
    backgroundColor: 'rgba(200,151,58,0.12)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(200,151,58,0.2)',
  },
  progressBg: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.full, overflow: 'hidden', marginBottom: spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: borderRadius.full },
  counterWarning: { ...typography.small, color: '#F59E0B', fontWeight: '600' },
  counterHint: { ...typography.small, color: '#8B7E9E' },

  plansSection: { paddingHorizontal: spacing.lg },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.secondary },
  sectionSubtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },

  paymentMessageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: '#FFF',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.xs,
  },
  paymentMessageBody: {
    flex: 1,
  },
  paymentMessageTitle: {
    ...typography.bodyBold,
    color: colors.secondary,
  },
  paymentMessageText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  planCard: {
    backgroundColor: '#FFF', borderRadius: borderRadius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  planCardPopular: {
    borderColor: colors.primary, borderWidth: 2,
  },
  popularBadge: {
    backgroundColor: colors.primaryTint, borderRadius: borderRadius.full,
    alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  popularText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.xs },
  planDot: { width: 10, height: 10, borderRadius: 5 },
  planName: { ...typography.h4, color: colors.secondary, flex: 1 },
  planPriceWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planPrice: { fontSize: 22, fontWeight: '800' },
  planPeriod: { ...typography.small, color: colors.textSecondary },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 6 },
  featureText: { ...typography.body, color: colors.text },

  planBtn: {
    marginTop: spacing.md, borderRadius: borderRadius.lg,
    paddingVertical: 12, alignItems: 'center',
  },
  planBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    backgroundColor: '#FFF', borderRadius: borderRadius.lg,
    padding: spacing.md, ...shadows.xs,
  },
  infoText: { ...typography.small, color: colors.textSecondary, flex: 1, lineHeight: 18 },

  restoreBtn: {
    alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
  },
  restoreText: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
