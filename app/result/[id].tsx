import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { blink } from '@/lib/blink';

const TYPE_LABELS: Record<string, string> = {
  stamp: 'Timbre', coin: 'Pièce', banknote: 'Billet', card: 'Carte', other: 'Objet',
};
const TYPE_COLORS: Record<string, string> = {
  stamp: '#C8973A', coin: '#8B7355', banknote: '#2D9B6F', card: '#3B6FE8', other: '#8B7E9E',
};
const RARITY_COLORS: Record<string, string> = {
  'Commun': '#6B7280', 'Peu commun': '#2D9B6F', 'Rare': '#3B6FE8',
  'Très rare': '#8B5CF6', 'Exceptionnel': '#C8973A',
};

interface DisplayResult {
  id: string;
  type: string;
  name: string;
  description: string;
  estimatedValueMin: number;
  estimatedValueMax: number;
  currency: string;
  confidenceScore: number;
  historicalInfo: string;
  originCountry: string;
  originYear: string;
  condition: string;
  rarity: string;
  keyFacts: string[];
  imageUrl: string;
  notes: string;
  createdAt: string;
}

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<DisplayResult | null>(null);
  const [notes, setNotes] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load item from DB
  useEffect(() => {
    if (!id) return;
    blink.db.collectionItems.get(id).then((item: any) => {
      if (!item) return;
      let analysis = { condition: '', rarity: 'Commun', keyFacts: [] as string[] };
      try { analysis = JSON.parse(item.aiAnalysis || '{}'); } catch {}
      setResult({
        id: item.id,
        type: item.type || 'other',
        name: item.name || 'Objet',
        description: item.description || '',
        estimatedValueMin: Number(item.estimatedValueMin) || 0,
        estimatedValueMax: Number(item.estimatedValueMax) || 0,
        currency: item.estimatedValueCurrency || 'EUR',
        confidenceScore: Number(item.confidenceScore) || 0,
        historicalInfo: item.historicalInfo || '',
        originCountry: item.originCountry || '',
        originYear: item.originYear || '',
        condition: analysis.condition || '',
        rarity: analysis.rarity || 'Commun',
        keyFacts: Array.isArray(analysis.keyFacts) ? analysis.keyFacts : [],
        imageUrl: item.imageUrl || '',
        notes: item.notes || '',
        createdAt: item.createdAt || new Date().toISOString(),
      });
      setNotes(item.notes || '');
    });
  }, [id]);

  // Auto-save notes with debounce
  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      if (id) {
        blink.db.collectionItems.update(id, {
          notes: text,
          updatedAt: new Date().toISOString(),
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['collection'] });
        });
      }
    }, 800);
  };

  const handleDelete = () => {
    if (!result) return;
    Alert.alert('Supprimer', `Supprimer "${result.name}" de votre collection ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await blink.db.collectionItems.delete(result.id);
            queryClient.invalidateQueries({ queryKey: ['collection'] });
            router.back();
          } catch {
            Alert.alert('Erreur', 'Impossible de supprimer.');
          }
        },
      },
    ]);
  };

  if (!result) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const typeColor = TYPE_COLORS[result.type] || colors.primary;
  const rarityColor = RARITY_COLORS[result.rarity] || colors.textSecondary;
  const confidence = Math.round(result.confidenceScore * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail</Text>
        <View style={styles.headerActions}>
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#2D9B6F" />
            <Text style={styles.savedBadgeText}>Collection</Text>
          </View>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Image */}
        {result.imageUrl ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: result.imageUrl }} style={styles.image} resizeMode="contain" />
            <View style={[styles.typePill, { backgroundColor: typeColor }]}>
              <Text style={styles.typePillText}>{TYPE_LABELS[result.type] || 'Objet'}</Text>
            </View>
          </View>
        ) : (
          <LinearGradient colors={['#1A1A2E', '#2D2D4E']} style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.primary} />
          </LinearGradient>
        )}

        {/* Name + confidence */}
        <View style={styles.card}>
          <Text style={styles.itemName}>{result.name}</Text>
          <View style={styles.row}>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '22', borderColor: rarityColor }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>{result.rarity}</Text>
            </View>
            <View style={styles.confidencePill}>
              <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
              <Text style={styles.confidenceText}>Confiance {confidence}%</Text>
            </View>
          </View>
          <Text style={styles.description}>{result.description}</Text>
        </View>

        {/* Value */}
        <LinearGradient colors={['#1A1A2E', '#2D2D4E']} style={styles.valueCard}>
          <View style={styles.valueHeader}>
            <Ionicons name="trending-up" size={18} color={colors.primary} />
            <Text style={styles.valueLabel}>Estimation de valeur</Text>
          </View>
          <Text style={styles.valueRange}>
            {result.estimatedValueMin.toFixed(2)} – {result.estimatedValueMax.toFixed(2)} {result.currency}
          </Text>
          <Text style={styles.valueNote}>Estimation basée sur l'état apparent</Text>
        </LinearGradient>

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Détails</Text>
          <DetailRow icon="flag-outline" label="Origine" value={result.originCountry} />
          <DetailRow icon="calendar-outline" label="Période" value={result.originYear} />
          <DetailRow icon="star-outline" label="État" value={result.condition} />
        </View>

        {/* Key facts */}
        {result.keyFacts?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Points clés</Text>
            {result.keyFacts.map((fact, i) => (
              <View key={i} style={styles.factRow}>
                <View style={styles.factDot} />
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Historical info */}
        {result.historicalInfo && (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.historyHeader}
              onPress={() => setHistoryExpanded(!historyExpanded)}
              activeOpacity={0.8}
            >
              <View style={styles.historyTitleRow}>
                <Ionicons name="book-outline" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>Contexte historique</Text>
              </View>
              <Ionicons
                name={historyExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {historyExpanded && (
              <Text style={styles.historyText}>{result.historicalInfo}</Text>
            )}
          </View>
        )}

        {/* Notes */}
        <View style={styles.card}>
          <View style={styles.notesHeader}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Notes personnelles</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Ajouter des notes sur cet objet..."
            placeholderTextColor={colors.textTertiary}
            multiline
            value={notes}
            onChangeText={handleNotesChange}
          />
        </View>

        {/* New scan CTA */}
        <TouchableOpacity
          style={styles.newScanBtn}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#E8B86D', '#C8973A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.newScanGradient}
          >
            <Ionicons name="scan" size={20} color="#FFF" />
            <Text style={styles.newScanText}>Nouveau scan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.primary} style={styles.detailIcon} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...typography.h4, color: colors.secondary, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#ECFDF5', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  savedBadgeText: { fontSize: 11, fontWeight: '600', color: '#2D9B6F' },
  deleteBtn: {
    padding: 6, backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#FECACA',
  },

  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 260, backgroundColor: colors.secondary },
  imagePlaceholder: {
    height: 200, justifyContent: 'center', alignItems: 'center',
  },
  typePill: {
    position: 'absolute', bottom: spacing.sm, left: spacing.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  typePillText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  card: {
    backgroundColor: '#FFF', marginHorizontal: spacing.lg,
    marginTop: spacing.md, borderRadius: borderRadius.xl,
    padding: spacing.lg, ...shadows.sm,
  },
  itemName: { ...typography.h3, color: colors.secondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  rarityBadge: {
    borderWidth: 1, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  rarityText: { fontSize: 11, fontWeight: '700' },
  confidencePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryTint, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  confidenceText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  valueCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    borderRadius: borderRadius.xl, padding: spacing.lg, ...shadows.md,
  },
  valueHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  valueLabel: { ...typography.captionBold, color: '#E8B86D', textTransform: 'uppercase', letterSpacing: 1 },
  valueRange: { fontSize: 28, fontWeight: '800', color: '#E8B86D', letterSpacing: -0.5 },
  valueNote: { ...typography.small, color: '#8B7E9E', marginTop: 4 },

  sectionTitle: { ...typography.captionBold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  detailIcon: { marginRight: spacing.sm },
  detailLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  detailValue: { ...typography.body, color: colors.secondary, fontWeight: '600' },

  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: 6 },
  factDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  factText: { ...typography.body, color: colors.text, flex: 1, lineHeight: 20 },

  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  historyText: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginTop: spacing.sm },

  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  notesInput: {
    ...typography.body, color: colors.text,
    minHeight: 60, textAlignVertical: 'top',
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },

  newScanBtn: { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden' },
  newScanGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  newScanText: { ...typography.bodyBold, color: '#FFF', fontSize: 16 },
});
