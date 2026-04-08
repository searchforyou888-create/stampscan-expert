import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, ActivityIndicator, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { CollectibleType } from '@/types/collection';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useScanCounter } from '@/hooks/useScanCounter';
import { blink } from '@/lib/blink';

const TYPES: { id: CollectibleType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'stamp', label: 'Timbre', icon: 'mail', color: '#C8973A' },
  { id: 'coin', label: 'Pièce', icon: 'ellipse', color: '#8B7355' },
  { id: 'banknote', label: 'Billet', icon: 'cash', color: '#2D9B6F' },
  { id: 'card', label: 'Carte', icon: 'card', color: '#3B6FE8' },
  { id: 'other', label: 'Autre', icon: 'cube', color: '#8B7E9E' },
];

export default function ScanScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<CollectibleType>('stamp');
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const { analyze, isLoading, error: analysisError } = useAIAnalysis();
  const { canScan, scansRemaining, isPremium, incrementScan, FREE_SCANS_LIMIT } = useScanCounter();
  const queryClient = useQueryClient();

  const checkAndScan = useCallback((): boolean => {
    if (canScan) return true;
    setUiError(`Vous avez utilisé vos ${FREE_SCANS_LIMIT} scans gratuits. Passez à un plan Premium.`);
    return false;
  }, [canScan, FREE_SCANS_LIMIT]);

  const handleAnalysis = useCallback(async (imageUri: string, webFile: File | null) => {
    setUiError(null);
    try {
      const result = await analyze(imageUri, selectedType, webFile);
      if (result) {
        const { publicUrl, ...scanResult } = result;
        const id = `item_${Date.now()}`;
        const now = new Date().toISOString();
        await blink.db.collectionItems.create({
          id,
          type: scanResult.type,
          name: scanResult.name,
          description: scanResult.description,
          estimatedValueMin: scanResult.estimatedValueMin,
          estimatedValueMax: scanResult.estimatedValueMax,
          estimatedValueCurrency: scanResult.currency,
          confidenceScore: scanResult.confidenceScore,
          historicalInfo: scanResult.historicalInfo,
          originCountry: scanResult.originCountry,
          originYear: scanResult.originYear,
          imageUrl: publicUrl || imageUri,
          aiAnalysis: JSON.stringify({
            condition: scanResult.condition,
            rarity: scanResult.rarity,
            keyFacts: scanResult.keyFacts,
          }),
          createdAt: now,
          updatedAt: now,
        });
        await incrementScan();
        queryClient.invalidateQueries({ queryKey: ['collection'] });
        router.push(`/result/${id}`);
      }
    } catch (err: any) {
      const msg = err?.message || 'Erreur inconnue';
      console.error('[CollectScan] handleAnalysis error:', msg);
      if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('auth')) {
        setUiError('Session expirée. Fermez et réouvrez l\'app pour réessayer.');
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('Network')) {
        setUiError('Vérifiez votre connexion internet et réessayez.');
      } else if (msg.includes('JSON') || msg.includes('parse')) {
        setUiError('L\'IA a retourné un format inattendu. Réessayez avec une photo plus nette.');
      } else {
        setUiError(`Erreur: ${msg.slice(0, 100)}`);
      }
    } finally {
      setPickedImage(null);
    }
  }, [selectedType, analyze, router, queryClient]);

  const pickImage = useCallback(async () => {
    if (!checkAndScan()) return;
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPickedImage(url);
        await handleAnalysis(url, file);
      };
      input.click();
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour scanner.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPickedImage(uri);
      await handleAnalysis(uri, null);
    }
  }, [handleAnalysis, checkAndScan]);

  const takePhoto = useCallback(async () => {
    if (!checkAndScan()) return;
    if (Platform.OS === 'web') {
      // On mobile web: open native camera via capture attribute
      // On desktop web: open file picker with camera preference
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment'); // Opens rear camera on mobile
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPickedImage(url);
        await handleAnalysis(url, file);
      };
      input.click();
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à la caméra pour scanner.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPickedImage(uri);
      await handleAnalysis(uri, null);
    }
  }, [handleAnalysis, checkAndScan]);

  const selectedTypeData = TYPES.find((t) => t.id === selectedType);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Error Banner */}
        {uiError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{uiError}</Text>
            <TouchableOpacity onPress={() => setUiError(null)} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>CollectScan</Text>
            <Text style={styles.appSubtitle}>Identifiez vos objets de collection</Text>
          </View>
          <View style={styles.headerRight}>
            {!isPremium && (
              <TouchableOpacity
                style={[styles.scanCounterBadge, scansRemaining <= 3 && scansRemaining > 0 && styles.scanCounterWarn, scansRemaining === 0 && styles.scanCounterEmpty]}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <Ionicons name="scan" size={12} color={scansRemaining === 0 ? '#EF4444' : scansRemaining <= 3 ? '#F59E0B' : colors.primary} />
                <Text style={[styles.scanCounterText, scansRemaining === 0 && { color: '#EF4444' }, scansRemaining <= 3 && scansRemaining > 0 && { color: '#F59E0B' }]}>
                  {scansRemaining}/{FREE_SCANS_LIMIT}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerBadge}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={styles.headerBadgeText}>IA</Text>
            </View>
          </View>
        </View>

        {/* Scanner Area */}
        <View style={styles.scannerContainer}>
          <LinearGradient
            colors={['#1A1A2E', '#2D2D4E']}
            style={styles.scannerGradient}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingIconWrap}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
                <Text style={styles.loadingText}>Analyse en cours…</Text>
                <Text style={styles.loadingSubText}>L'IA examine votre objet</Text>
                <View style={styles.loadingDots}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.loadingDot, { opacity: 0.4 + i * 0.2 }]} />
                  ))}
                </View>
              </View>
            ) : pickedImage ? (
              <Image source={{ uri: pickedImage }} style={styles.previewImage} resizeMode="contain" />
            ) : (
              <View style={styles.scannerFrame}>
                {/* Corner brackets */}
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
                {/* Center content */}
                <View style={styles.scannerCenter}>
                  <Ionicons name="scan" size={56} color={colors.primary} style={styles.scanIcon} />
                  <Text style={styles.scanHintText}>Pointez votre caméra</Text>
                  <Text style={styles.scanHintSub}>sur l'objet de collection</Text>
                </View>
              </View>
            )}
          </LinearGradient>

          {/* Type badge overlay */}
          {selectedTypeData && (
            <View style={[styles.typeBadge, { backgroundColor: selectedTypeData.color }]}>
              <Ionicons name={selectedTypeData.icon} size={12} color="#FFF" />
              <Text style={styles.typeBadgeText}>{selectedTypeData.label}</Text>
            </View>
          )}
        </View>

        {/* Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type d'objet</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typesRow}
            contentContainerStyle={styles.typesRowContent}
          >
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeChip,
                  selectedType === t.id && { backgroundColor: t.color, borderColor: t.color },
                ]}
                onPress={() => setSelectedType(t.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: selectedType === t.id }}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={selectedType === t.id ? '#FFF' : t.color}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    selectedType === t.id && { color: '#FFF' },
                    { color: selectedType === t.id ? '#FFF' : t.color },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Primary: Camera / Import */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={takePhoto}
            disabled={isLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Scanner avec la caméra"
          >
            <LinearGradient
              colors={['#E8B86D', '#C8973A', '#A67A28']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <Ionicons name="camera" size={26} color="#FFF" />
              <Text style={styles.primaryButtonText}>
                Scanner avec la caméra
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary: Gallery / File upload */}
          <TouchableOpacity
            style={[styles.secondaryButton, isLoading && styles.disabledButton]}
            onPress={pickImage}
            disabled={isLoading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Depuis la galerie"
          >
            <Ionicons name="images-outline" size={20} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>
              Importer une photo
            </Text>
          </TouchableOpacity>
        </View>


        {/* Tips */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={16} color={colors.primary} />
            <Text style={styles.tipsTitle}>Conseils pour un bon scan</Text>
          </View>
          {[
            { icon: 'sunny-outline' as const, text: 'Bonne lumière, évitez les reflets' },
            { icon: 'expand-outline' as const, text: "Centrez l'objet dans le cadre" },
            { icon: 'eye-outline' as const, text: 'Photo nette, sans flou' },
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipIconWrap}>
                <Ionicons name={tip.icon} size={14} color={colors.primary} />
              </View>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 26;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  appSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  scanCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  scanCounterWarn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  scanCounterEmpty: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  scanCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // Scanner
  scannerContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  scannerGradient: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 190,
    height: 190,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerCenter: {
    alignItems: 'center',
  },
  scanIcon: {
    opacity: 0.45,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#C8973A',
    borderTopLeftRadius: 5,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#C8973A',
    borderTopRightRadius: 5,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#C8973A',
    borderBottomLeftRadius: 5,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#C8973A',
    borderBottomRightRadius: 5,
  },
  scanHintText: {
    color: '#E8B86D',
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  scanHintSub: {
    color: '#8B7E9E',
    fontSize: 11,
    marginTop: 2,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(200, 151, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200, 151, 58, 0.3)',
  },
  loadingText: {
    color: '#E8B86D',
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  loadingSubText: {
    color: '#8B7E9E',
    fontSize: 12,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  // Type badge overlay
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },

  // Section
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  typesRow: {
    flexDirection: 'row',
  },
  typesRowContent: {
    paddingRight: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    marginRight: spacing.sm,
    minHeight: 44,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  primaryButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
    minHeight: 56,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    minHeight: 56,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.55,
  },

  // Tips
  tipsContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  tipsTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
});
