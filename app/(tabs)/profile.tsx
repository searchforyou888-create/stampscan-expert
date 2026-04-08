import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { useScanCounter } from '@/hooks/useScanCounter';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '1,99€',
    period: '/mois',
    color: '#3B6FE8',
    features: ['Scans illimités', 'Catalogue jusqu\'à 100 objets', 'Estimation de valeur'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '4,99€',
    period: '/mois',
    color: '#C8973A',
    features: ['Scans illimités', 'Catalogue illimité', 'Estimations avancées', 'Export PDF', 'Support prioritaire'],
    popular: true,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '39,99€',
    period: ' une fois',
    color: '#8B5CF6',
    features: ['Tout du plan Pro', 'Accès à vie', 'Mises à jour futures', 'Aucun abonnement'],
    popular: false,
  },
];

export default function ProfileScreen() {
  const { scansUsed, scansRemaining, FREE_SCANS_LIMIT, isPremium } = useScanCounter();

  const pct = Math.min(1, scansUsed / FREE_SCANS_LIMIT);
  const barColor = pct >= 0.9 ? '#EF4444' : pct >= 0.6 ? '#F59E0B' : colors.primary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>

        {/* Free scan counter */}
        {!isPremium && (
          <View style={styles.counterCard}>
            <LinearGradient colors={['#1A1A2E', '#2D2D4E']} style={styles.counterGradient}>
              <View style={styles.counterTop}>
                <View>
                  <Text style={styles.counterLabel}>Scans gratuits restants</Text>
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
                  ⚠️ Vous avez utilisé tous vos scans gratuits. Passez à un plan payant.
                </Text>
              ) : scansRemaining <= 3 ? (
                <Text style={styles.counterWarning}>
                  Plus que {scansRemaining} scan{scansRemaining > 1 ? 's' : ''} gratuit{scansRemaining > 1 ? 's' : ''} !
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
          <Text style={styles.sectionSubtitle}>Débloquez tous les scans et fonctionnalités avancées</Text>

          {PLANS.map((plan) => (
            <View key={plan.id} style={[styles.planCard, plan.popular && styles.planCardPopular]}>
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>⭐ Populaire</Text>
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
                style={[styles.planBtn, { backgroundColor: plan.color }]}
                activeOpacity={0.85}
                onPress={() => {}}
              >
                <Text style={styles.planBtnText}>Choisir {plan.name}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Les paiements sont sécurisés via l'App Store et Google Play. Vous pouvez annuler à tout moment.
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
});
