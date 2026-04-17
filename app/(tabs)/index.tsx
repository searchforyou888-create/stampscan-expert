import React, { useState, useCallback } from 'react';
import {
  Alert, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, ActivityIndicator, Image, Modal
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
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ScannerOverlay } from '@/components/ScannerOverlay';

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
  const [showScannerModal, setShowScannerModal] = useState(false);
  const { analyze, isLoading } = useAIAnalysis();
  const { canScan, scansRemaining, isPremium, incrementScan, FREE_SCANS_LIMIT } = useScanCounter();
  const { user, isOwnerModeActive } = useAuth();
  const queryClient = useQueryClient();

  const checkAndScan = useCallback((): boolean => {
    if (canScan) return true;
    setUiError(
      isOwnerModeActive
        ? `Vous avez utilisé vos ${FREE_SCANS_LIMIT} scans proprietaire sur cet appareil.`
        : `Vous avez utilisé vos ${FREE_SCANS_LIMIT} scans gratuits. Passez à un plan Premium.`
    );
    return false;
  }, [canScan, FREE_SCANS_LIMIT, isOwnerModeActive]);

  const handleAnalysis = useCallback(async (imageUri: string, webFile: File | null) => {
    setUiError(null);
    try {
      const result = await analyze(imageUri, selectedType, webFile);
      if (result) {
        const { imageUrl, storagePath, ...scanResult } = result;
        const now = new Date().toISOString();
        const { data: createdItem, error: saveError } = await supabase
          .from('collection_items')
          .insert({
            type: scanResult.type,
            name: scanResult.name,
            description: scanResult.description,
            estimated_value_min: scanResult.estimatedValueMin,
            estimated_value_max: scanResult.estimatedValueMax,
            estimated_value_currency: scanResult.currency,
            confidence_score: scanResult.confidenceScore,
            historical_info: scanResult.historicalInfo,
            origin_country: scanResult.originCountry,
            origin_year: scanResult.originYear,
            image_url: storagePath || imageUrl || imageUri,
            ai_analysis: JSON.stringify({
              condition: scanResult.condition,
              rarity: scanResult.rarity,
              keyFacts: scanResult.keyFacts,
            }),
            catalogue_ref: scanResult.catalogueRef || null,
            marketplaces: scanResult.marketplaces || null,
            user_id: isOwnerModeActive ? null : user?.id,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();
        if (saveError) throw new Error(saveError.message);
        await incrementScan();
        queryClient.invalidateQueries({ queryKey: ['collection'] });
        router.push(`/result/${createdItem!.id}`);
      }
    } catch (err: any) {
      const msg = err?.message || 'Erreur inconnue';
      console.error('[CollectScan] handleAnalysis error:', msg);
      if (msg === 'BLINK_AUTH_TIMEOUT' || msg === 'BLINK_AUTH_FAILED') {
        setUiError('La session de scan n\u2019a pas pu être initialisée. Rechargez puis réessayez.');
      } else if (msg.includes('UPLOAD_FAILED')) {
        setUiError('La photo n a pas pu etre envoyee pour analyse. Reessayez avec une image plus legere ou rechargez la page.');
      } else if (msg === 'AI_QUOTA_EXCEEDED') {
        setUiError('Le service d analyse est temporairement indisponible. Reessayez dans quelques minutes.');
      } else if (msg === 'NETWORK_REQUEST_FAILED') {
        setUiError('Vérifiez votre connexion internet et réessayez.');
      } else if (msg.includes('invalid input syntax for type uuid') || msg.includes('uuid')) {
        setUiError('La sauvegarde de l estimation a echoue a cause d un identifiant invalide. Rechargez puis reessayez.');
      } else if (msg === 'AI_INVALID_JSON' || msg === 'AI_EMPTY_RESPONSE' || msg === 'AI_REQUEST_FAILED') {
        setUiError('L\'IA a retourné un format inattendu. Réessayez avec une photo plus nette.');
      } else {
        setUiError(`Erreur: ${msg.slice(0, 100)}`);
      }
    } finally {
      setPickedImage(null);
    }
  }, [selectedType, analyze, isOwnerModeActive, router, queryClient, incrementScan, user?.id]);

  const handleWebFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPickedImage(url);
    await handleAnalysis(url, file);
    e.target.value = '';
  }, [handleAnalysis]);

  const handleWebInputClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (!checkAndScan() || isLoading) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [checkAndScan, isLoading]);

  const pickImage = useCallback(async () => {
    if (!checkAndScan()) return;
    if (Platform.OS === 'web') return;

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
    if (Platform.OS === 'web') return;
    setShowScannerModal(false); // Fermer le modal d'abord
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
        {/* Paywall — affiché en priorité si plus d'essai */}
        {!isPremium && scansRemaining === 0 ? (
          <View style={styles.paywallCard}>
            <LinearGradient colors={['#1A1A2E', '#2D2D4E']} style={styles.paywallGradient}>
              <Ionicons name="lock-closed" size={40} color="#FFD60A" />
              <Text style={styles.paywallTitle}>{isOwnerModeActive ? 'Quota proprietaire atteint' : 'Essais gratuits épuisés'}</Text>
              <Text style={styles.paywallSubtitle}>
                {isOwnerModeActive
                  ? `Vous avez utilisé vos ${FREE_SCANS_LIMIT} scans proprietaire disponibles sur cet appareil.`
                  : `Vous avez utilisé vos ${FREE_SCANS_LIMIT} analyses gratuites. Passez à Premium pour continuer à scanner.`}
              </Text>
              <TouchableOpacity
                style={styles.paywallBtn}
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Ionicons name="star" size={16} color="#1A1A2E" />
                <Text style={styles.paywallBtnText}>{isOwnerModeActive ? 'Voir le profil' : 'Voir les abonnements'}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : null}

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
                style={[styles.scanCounterBadge, scansRemaining === 1 && styles.scanCounterWarn, scansRemaining === 0 && styles.scanCounterEmpty]}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <Ionicons name="scan" size={12} color={scansRemaining === 0 ? '#EF4444' : scansRemaining === 1 ? '#F59E0B' : colors.primary} />
                <Text style={[styles.scanCounterText, scansRemaining === 0 && { color: '#EF4444' }, scansRemaining === 1 && { color: '#F59E0B' }]}>
                  {scansRemaining}/{FREE_SCANS_LIMIT}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerBadge}>
              <Ionicons name="sparkles" size={14} color="#1A1A2E" />
              <Text style={styles.headerBadgeText}>IA</Text>
            </View>
          </View>
        </View>

        {/* Scanner Area */}
        {Platform.OS === 'web' ? (
          <View style={[styles.scannerContainer, isLoading && styles.disabledButton]}>
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
                  <Text style={styles.loadingSubText}>L&apos;IA examine votre objet</Text>
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
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />
                  <View style={styles.scannerCenter}>
                    <Ionicons name="scan" size={56} color={colors.primary} style={styles.scanIcon} />
                    <Text style={styles.scanHintText}>Touchez pour scanner</Text>
                    <Text style={styles.scanHintSub}>ouvrez directement la caméra</Text>
                  </View>
                </View>
              )}
            </LinearGradient>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onClick={handleWebInputClick as any}
              onChange={handleWebFileChange as any}
              disabled={isLoading}
              aria-label="Zone de scan principale"
              style={styles.webInputOverlay as any}
            />

            {selectedTypeData && (
              <View style={[styles.typeBadge, { backgroundColor: selectedTypeData.color }]}> 
                <Ionicons name={selectedTypeData.icon} size={12} color="#FFF" />
                <Text style={styles.typeBadgeText}>{selectedTypeData.label}</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.scannerContainer, isLoading && styles.disabledButton]}
            onPress={() => setShowScannerModal(true)}
            disabled={isLoading}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Zone de scan principale"
          >
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
                  <Text style={styles.loadingSubText}>L&apos;IA examine votre objet</Text>
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
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />
                  <View style={styles.scannerCenter}>
                    <Ionicons name="scan" size={56} color={colors.primary} style={styles.scanIcon} />
                    <Text style={styles.scanHintText}>Touchez pour scanner</Text>
                    <Text style={styles.scanHintSub}>ouvrez directement la caméra</Text>
                  </View>
                </View>
              )}
            </LinearGradient>

            {selectedTypeData && (
              <View style={[styles.typeBadge, { backgroundColor: selectedTypeData.color }]}> 
                <Ionicons name={selectedTypeData.icon} size={12} color="#FFF" />
                <Text style={styles.typeBadgeText}>{selectedTypeData.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type d&apos;objet</Text>
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
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(tabs)/catalogue')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Faire expertiser un objet"
          >
            <LinearGradient
                colors={['#2D9B6F', '#1F7A5A', '#15533E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <Ionicons name="shield-checkmark" size={24} color="#FFF" />
              <Text style={styles.primaryButtonText}>
                Faire expertiser
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary: Gallery / File upload */}
          {Platform.OS === 'web' ? (
            <View style={[styles.secondaryButton, isLoading && styles.disabledButton]}>
              <Ionicons name="images-outline" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>
                Importer une photo
              </Text>
              <input
                type="file"
                accept="image/*"
                onClick={handleWebInputClick as any}
                onChange={handleWebFileChange as any}
                disabled={isLoading}
                aria-label="Depuis la galerie"
                style={styles.webInputOverlay as any}
              />
            </View>
          ) : (
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
          )}
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

      {/* Scanner Modal Futuriste */}
      <Modal
        visible={showScannerModal}
        animationType="fade"
        transparent={false}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <ScannerOverlay
            onCapture={takePhoto}
            isLoading={isLoading}
            type={selectedType}
          />

          {/* Bouton Fermer */}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowScannerModal(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Indicateur Flash */}
          <View style={styles.flashIndicator}>
            <Ionicons name="flash-off" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.flashText}>Flash: Off</Text>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.4)',
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
    color: '#FFD60A',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFD60A',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A2E',
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
    height: 228,
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
    borderColor: '#FFD60A',
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
    borderColor: '#FFD60A',
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
    borderColor: '#FFD60A',
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
    borderColor: '#FFD60A',
    borderBottomRightRadius: 5,
  },
  scanHintText: {
    color: '#FFD60A',
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
    backgroundColor: 'rgba(255,214,10,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.35)',
  },
  loadingText: {
    color: '#FFD60A',
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
    marginTop: spacing.md,
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
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  primaryButton: {
    position: 'relative',
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
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 0,
    backgroundColor: colors.secondary,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#FFD60A',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
  webInputOverlay: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
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
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },

  // Paywall
  paywallCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  paywallGradient: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  paywallTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFD60A',
    textAlign: 'center',
  },
  paywallSubtitle: {
    fontSize: 14,
    color: '#8B7E9E',
    textAlign: 'center',
    lineHeight: 20,
  },
  paywallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFD60A',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  paywallBtnText: {
    color: '#1A1A2E',
    fontWeight: '800',
    fontSize: 15,
  },

  // Scanner Modal
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  flashIndicator: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  flashText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
});
