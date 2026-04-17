import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, TextInput, Modal, Linking,
} from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { supabase } from '@/lib/supabase';
import { generateExpertCertificate } from '@/lib/expertCertificate';
import { getDelcampeSellUrl, getEbaySearchUrl, getMarketplaceSearchLabel } from '@/lib/marketplaceLinks';
import { QRCodeShare } from '@/components/QRCodeShare';
import { useAuth } from '@/hooks/useAuth';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useAnalysisCounter } from '@/hooks/useAnalysisCounter';
import type { ExpertVerificationStatus } from '@/types/supabase';
import { resolveStoredImageUrl } from '@/lib/storage';

function getEdgeFunctionBase(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || '';
}

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

type GuidedConditionGrade = 'auto' | 'mint' | 'very_good' | 'worn';
type GuidedConditionIssue = 'folded' | 'stained' | 'damaged_edges';

const CONDITION_GRADE_OPTIONS: Array<{ id: GuidedConditionGrade; label: string; factor: number }> = [
  { id: 'auto', label: 'Etat IA', factor: 1 },
  { id: 'mint', label: 'Neuf', factor: 1.12 },
  { id: 'very_good', label: 'Tres bon', factor: 1 },
  { id: 'worn', label: 'Use', factor: 0.72 },
];

const CONDITION_ISSUE_OPTIONS: Array<{ id: GuidedConditionIssue; label: string; factor: number; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'folded', label: 'Plie', factor: 0.82, icon: 'remove-outline' },
  { id: 'stained', label: 'Tache', factor: 0.88, icon: 'water-outline' },
  { id: 'damaged_edges', label: 'Bord abime', factor: 0.86, icon: 'cut-outline' },
];

function calculateConditionFactor(grade: GuidedConditionGrade, issues: GuidedConditionIssue[]) {
  const gradeFactor = CONDITION_GRADE_OPTIONS.find((option) => option.id === grade)?.factor ?? 1;
  const issueFactor = issues.reduce((accumulator, issue) => {
    const factor = CONDITION_ISSUE_OPTIONS.find((option) => option.id === issue)?.factor ?? 1;
    return accumulator * factor;
  }, 1);

  return Math.max(0.45, Math.min(1.2, gradeFactor * issueFactor));
}

function getConditionSummary(grade: GuidedConditionGrade, issues: GuidedConditionIssue[]) {
  const gradeLabel = CONDITION_GRADE_OPTIONS.find((option) => option.id === grade)?.label ?? 'Etat IA';
  if (issues.length === 0) return gradeLabel;

  const issuesLabel = issues
    .map((issue) => CONDITION_ISSUE_OPTIONS.find((option) => option.id === issue)?.label)
    .filter(Boolean)
    .join(', ');

  return `${gradeLabel} · ${issuesLabel}`;
}

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
  catalogueRef: string;
  marketplaces: string;
  imageUrl: string;
  notes: string;
  createdAt: string;
  expertVerificationStatus: ExpertVerificationStatus;
  expertVerificationRequestedAt: string | null;
  expertVerificationCompletedAt: string | null;
  expertVerificationReport: string;
  guidedConditionGrade: GuidedConditionGrade;
  guidedConditionIssues: GuidedConditionIssue[];
}

type PaywallAction = 'analysis' | 'verification';

export default function ResultScreen() {
  const { isAuthenticated, user, isOwnerModeActive } = useAuth();
  const { isPremium, packages, purchase, isLoading: rcLoading } = useRevenueCat();
  const { canAnalyze, analysesRemaining, incrementAnalysis } = useAnalysisCounter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<DisplayResult | null>(null);
  const [notes, setNotes] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallAction, setPaywallAction] = useState<PaywallAction>('analysis');
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAnalyse = () => {
    if (canAnalyze) {
      triggerAnalysis().then(() => incrementAnalysis());
    } else {
      setPaywallAction('analysis');
      setShowPaywall(true);
    }
  };

  const triggerAnalysis = async () => {
    if (!result?.imageUrl) {
      Alert.alert('Erreur', "Aucune image disponible pour l'analyse.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      const res = await fetch(`${supabaseUrl}/functions/v1/identify-item`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ imageUrl: result.imageUrl, type: result.type }),
      });
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const data = await res.json() as { success?: boolean; result?: Record<string, unknown>; error?: string };
      if (!data.success || !data.result) throw new Error('Réponse invalide');

      const r = data.result;
      const aiAnalysis = JSON.stringify({
        condition: r.condition,
        rarity: r.rarity,
        keyFacts: r.keyFacts,
      });

      await supabase.from('collection_items').update({
        name: (r.name as string) || result.name,
        description: (r.description as string) || result.description,
        estimated_value_min: Number(r.estimatedValueMin) || 0,
        estimated_value_max: Number(r.estimatedValueMax) || 0,
        estimated_value_currency: (r.currency as string) || 'EUR',
        confidence_score: Number(r.confidenceScore) || 0,
        historical_info: r.historicalInfo as string,
        origin_country: r.originCountry as string,
        origin_year: String(r.originYear || ''),
        catalogue_ref: (r.catalogueRef as string) || null,
        marketplaces: (r.marketplaces as string) || null,
        ai_analysis: aiAnalysis,
        updated_at: new Date().toISOString(),
      }).eq('id', result.id);

      setResult(prev => prev ? {
        ...prev,
        name: (r.name as string) || prev.name,
        description: (r.description as string) || prev.description,
        estimatedValueMin: Number(r.estimatedValueMin) || 0,
        estimatedValueMax: Number(r.estimatedValueMax) || 0,
        currency: (r.currency as string) || 'EUR',
        confidenceScore: Number(r.confidenceScore) || 0,
        historicalInfo: (r.historicalInfo as string) || '',
        originCountry: (r.originCountry as string) || '',
        originYear: String(r.originYear || ''),
        condition: (r.condition as string) || '',
        rarity: (r.rarity as string) || 'Commun',
        keyFacts: Array.isArray(r.keyFacts) ? r.keyFacts as string[] : [],
        catalogueRef: (r.catalogueRef as string) || '',
        marketplaces: (r.marketplaces as string) || '',
      } : null);

      queryClient.invalidateQueries({ queryKey: ['collection'] });
      Alert.alert('Analyse terminée', 'Les informations ont été mises à jour avec succès.');
    } catch {
      Alert.alert('Erreur', "L'analyse a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const requestExpertVerification = async () => {
    if (!result) return;
    if (result.expertVerificationStatus === 'pending') {
      Alert.alert('Déjà demandé', 'Une verification humaine est deja en attente pour cet objet.');
      return;
    }

    setIsRequestingVerification(true);

    try {
      const requestedAt = new Date().toISOString();
      const { error } = await supabase.from('collection_items').update({
        expert_verification_status: 'pending',
        expert_verification_requested_at: requestedAt,
        expert_verification_completed_at: null,
        expert_verification_report: '',
        updated_at: requestedAt,
      }).eq('id', result.id);

      if (error) throw error;

      setResult((prev) => prev ? {
        ...prev,
        expertVerificationStatus: 'pending',
        expertVerificationRequestedAt: requestedAt,
        expertVerificationCompletedAt: null,
        expertVerificationReport: '',
      } : null);

      queryClient.invalidateQueries({ queryKey: ['collection'] });

      Alert.alert(
        'Verification transmise',
        `La photo et l analyse de ${result.name} ont ete placees dans la file de revue expert. Validation attendue sous 24 h${user?.email ? ` pour le compte ${user.email}` : ''}.`
      );
    } catch (err: any) {
      console.error('[CollectScan] expert verification request error:', err?.message || String(err));
      Alert.alert('Erreur', 'Impossible de transmettre la demande de verification pour le moment.');
    } finally {
      setIsRequestingVerification(false);
    }
  };

  const handleRequestVerification = () => {
    if (canAnalyze) {
      requestExpertVerification();
    } else {
      setPaywallAction('verification');
      setShowPaywall(true);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!result) return;

    setIsGeneratingCertificate(true);

    try {
      const exportResult = await generateExpertCertificate(result);

      if (exportResult.mode === 'printed') {
        Alert.alert(
          'Certificat prêt',
          'La fenêtre d impression s est ouverte. Choisissez Enregistrer en PDF pour conserver votre certificat.'
        );
      } else if (exportResult.mode === 'saved') {
        Alert.alert(
          'Certificat généré',
          'Le PDF a été généré sur l appareil. Le partage automatique n est pas disponible sur cette plateforme.'
        );
      }
    } catch (err: any) {
      const message = err?.message || 'GENERATION_FAILED';
      console.error('[CollectScan] certificate generation error:', message);
      Alert.alert(
        'Erreur',
        'La génération du certificat a échoué. Réessayez dans un instant.'
      );
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  const openExternalLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      await Linking.openURL(url);
    }
  };

  const updateGuidedCondition = async (grade: GuidedConditionGrade, issues: GuidedConditionIssue[]) => {
    if (!result) return;

    const previousGrade = result.guidedConditionGrade;
    const previousIssues = result.guidedConditionIssues;
    const updatedAt = new Date().toISOString();

    setResult((prev) => prev ? {
      ...prev,
      guidedConditionGrade: grade,
      guidedConditionIssues: issues,
    } : null);

    try {
      const { error } = await supabase.from('collection_items').update({
        guided_condition_grade: grade,
        guided_condition_issues: issues,
        updated_at: updatedAt,
      }).eq('id', result.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['collection'] });
    } catch (err: any) {
      setResult((prev) => prev ? {
        ...prev,
        guidedConditionGrade: previousGrade,
        guidedConditionIssues: previousIssues,
      } : null);

      console.error('[CollectScan] guided condition update error:', err?.message || String(err));
      Alert.alert('Erreur', 'Impossible de sauvegarder cet ajustement d etat pour le moment.');
    }
  };

  const handleGuidedGradePress = (grade: GuidedConditionGrade) => {
    if (!result || result.guidedConditionGrade === grade) return;
    updateGuidedCondition(grade, result.guidedConditionIssues);
  };

  const handleGuidedIssueToggle = (issue: GuidedConditionIssue) => {
    if (!result) return;

    const nextIssues = result.guidedConditionIssues.includes(issue)
      ? result.guidedConditionIssues.filter((entry) => entry !== issue)
      : [...result.guidedConditionIssues, issue];

    updateGuidedCondition(result.guidedConditionGrade, nextIssues);
  };

  // Load item from DB
  useEffect(() => {
    if (!id) return;
    supabase.from('collection_items').select('*').eq('id', id).single()
      .then(async ({ data: item }) => {
        if (!item) return;
        let analysis = { condition: '', rarity: 'Commun', keyFacts: [] as string[] };
        try { analysis = JSON.parse(item.ai_analysis || '{}'); } catch {}
        const imageUrl = await resolveStoredImageUrl(item.image_url || '');
        setResult({
          id: item.id,
          type: item.type || 'other',
          name: item.name || 'Objet',
          description: item.description || '',
          estimatedValueMin: Number(item.estimated_value_min) || 0,
          estimatedValueMax: Number(item.estimated_value_max) || 0,
          currency: item.estimated_value_currency || 'EUR',
          confidenceScore: Number(item.confidence_score) || 0,
          historicalInfo: item.historical_info || '',
          originCountry: item.origin_country || '',
          originYear: item.origin_year || '',
          condition: analysis.condition || '',
          rarity: analysis.rarity || 'Commun',
          keyFacts: Array.isArray(analysis.keyFacts) ? analysis.keyFacts : [],
          catalogueRef: item.catalogue_ref || '',
          marketplaces: item.marketplaces || '',
          imageUrl,
          notes: item.notes || '',
          createdAt: item.created_at || new Date().toISOString(),
          expertVerificationStatus: item.expert_verification_status || 'none',
          expertVerificationRequestedAt: item.expert_verification_requested_at || null,
          expertVerificationCompletedAt: item.expert_verification_completed_at || null,
          expertVerificationReport: item.expert_verification_report || '',
          guidedConditionGrade: (item.guided_condition_grade as GuidedConditionGrade) || 'auto',
          guidedConditionIssues: Array.isArray(item.guided_condition_issues) ? item.guided_condition_issues as GuidedConditionIssue[] : [],
        });
        setNotes(item.notes || '');
      });
  }, [id]);

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  // Auto-save notes with debounce
  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      if (id) {
        supabase.from('collection_items').update({ notes: text, updated_at: new Date().toISOString() })
          .eq('id', id)
          .then(() => queryClient.invalidateQueries({ queryKey: ['collection'] }));
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
            await supabase.from('collection_items').delete().eq('id', result.id);
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
  const shareUrl = `https://stampscan.app/result/${result.id}`;
  const ebaySearchUrl = getEbaySearchUrl(result);
  const delcampeSellUrl = getDelcampeSellUrl();
  const marketplaceQuery = getMarketplaceSearchLabel(result);
  const guidedConditionFactor = calculateConditionFactor(result.guidedConditionGrade, result.guidedConditionIssues);
  const adjustedValueMin = result.estimatedValueMin * guidedConditionFactor;
  const adjustedValueMax = result.estimatedValueMax * guidedConditionFactor;
  const hasGuidedAdjustment = result.guidedConditionGrade !== 'auto' || result.guidedConditionIssues.length > 0;
  const guidedConditionSummary = getConditionSummary(result.guidedConditionGrade, result.guidedConditionIssues);
  const guidedConditionDelta = Math.round((guidedConditionFactor - 1) * 100);
  const verificationStatusColor = result.expertVerificationStatus === 'verified'
    ? colors.success
    : result.expertVerificationStatus === 'pending'
      ? colors.warning
      : colors.textSecondary;
  const verificationStatusLabel = result.expertVerificationStatus === 'verified'
    ? 'Valide par un expert'
    : result.expertVerificationStatus === 'pending'
      ? 'En attente de validation'
      : 'Aucune verification humaine';
  const paywallTitle = paywallAction === 'verification' ? 'Verification par un expert' : 'Analyse IA Complète';
  const paywallSubtitle = paywallAction === 'verification'
    ? 'Declenchez une revue humaine sous 24 h avec verification manuelle de la photo, du contexte et de la valeur estimee.'
    : 'Obtenez la valeur précise, l’histoire détaillée, l’état et la rareté de chaque objet de votre collection';
  const paywallFeatures = paywallAction === 'verification'
    ? [
        { icon: 'person-circle', text: 'Relecture par un expert reel' },
        { icon: 'time', text: 'Retour cible sous 24 h' },
        { icon: 'checkmark-done', text: 'Validation de l etat et du contexte' },
        { icon: 'document-text', text: 'Compte rendu rattache a l objet' },
      ]
    : [
        { icon: 'trending-up', text: 'Valeur marché en temps réel' },
        { icon: 'book', text: 'Histoire et contexte historique' },
        { icon: 'star', text: 'État, rareté et authenticité' },
        { icon: 'bulb', text: 'Points clés et anecdotes' },
      ];

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
            {(hasGuidedAdjustment ? adjustedValueMin : result.estimatedValueMin).toFixed(2)} – {(hasGuidedAdjustment ? adjustedValueMax : result.estimatedValueMax).toFixed(2)} {result.currency}
          </Text>
          <Text style={styles.valueNote}>
            {hasGuidedAdjustment
              ? `Ajuste selon votre saisie d etat: ${guidedConditionSummary}`
              : 'Estimation basée sur l état apparent'}
          </Text>
          {hasGuidedAdjustment ? (
            <View style={styles.adjustmentMetaRow}>
              <Text style={styles.adjustmentMetaText}>
                Base IA: {result.estimatedValueMin.toFixed(2)} – {result.estimatedValueMax.toFixed(2)} {result.currency}
              </Text>
              <View style={[styles.adjustmentDeltaBadge, guidedConditionDelta >= 0 ? styles.adjustmentDeltaPositive : styles.adjustmentDeltaNegative]}>
                <Text style={[styles.adjustmentDeltaText, guidedConditionDelta >= 0 ? styles.adjustmentDeltaTextPositive : styles.adjustmentDeltaTextNegative]}>
                  {guidedConditionDelta >= 0 ? '+' : ''}{guidedConditionDelta}%
                </Text>
              </View>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.guidedHeader}>
            <View style={styles.guidedTitleRow}>
              <Ionicons name="options-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Assistant d etat</Text>
            </View>
            {hasGuidedAdjustment ? (
              <TouchableOpacity onPress={() => updateGuidedCondition('auto', [])} activeOpacity={0.8}>
                <Text style={styles.guidedResetText}>Reinitialiser</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.guidedIntro}>
            Affinez l estimation selon l etat reel de votre objet: niveau general puis defauts visibles.
          </Text>

          <Text style={styles.guidedGroupLabel}>Niveau general</Text>
          <View style={styles.guidedOptionsWrap}>
            {CONDITION_GRADE_OPTIONS.map((option) => {
              const isSelected = result.guidedConditionGrade === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.guidedChip, isSelected && styles.guidedChipSelected]}
                  onPress={() => handleGuidedGradePress(option.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.guidedChipText, isSelected && styles.guidedChipTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.guidedGroupLabel}>Defauts visibles</Text>
          <View style={styles.guidedOptionsWrap}>
            {CONDITION_ISSUE_OPTIONS.map((option) => {
              const isSelected = result.guidedConditionIssues.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.guidedChip, isSelected && styles.guidedChipSelected]}
                  onPress={() => handleGuidedIssueToggle(option.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={option.icon}
                    size={14}
                    color={isSelected ? colors.secondary : colors.textSecondary}
                  />
                  <Text style={[styles.guidedChipText, isSelected && styles.guidedChipTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.guidedSummaryBox}>
            <Text style={styles.guidedSummaryLabel}>Lecture retenue</Text>
            <Text style={styles.guidedSummaryText}>{guidedConditionSummary}</Text>
            <Text style={styles.guidedSummarySub}>
              Estimation ajustee: {adjustedValueMin.toFixed(2)} – {adjustedValueMax.toFixed(2)} {result.currency}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Détails</Text>
          <DetailRow icon="flag-outline" label="Origine" value={result.originCountry} />
          <DetailRow icon="calendar-outline" label="Période" value={result.originYear} />
          <DetailRow icon="star-outline" label="État" value={hasGuidedAdjustment ? `${result.condition || 'Etat estime'} · ${guidedConditionSummary}` : result.condition} />
          {result.catalogueRef && <DetailRow icon="barcode-outline" label="Référence catalogue" value={result.catalogueRef} />}
          {result.marketplaces && <DetailRow icon="storefront-outline" label="Prix marché" value={result.marketplaces} />}
          <DetailRow icon="time-outline" label="Scanne le" value={new Date(result.createdAt).toLocaleString('fr-FR')} />
        </View>

        <View style={styles.card}>
          <View style={styles.marketHeader}>
            <Ionicons name="rocket-outline" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Strategie marche</Text>
          </View>
          <Text style={styles.marketIntro}>
            On exploite automatiquement l identification pour comparer le meme objet sur eBay et ouvrir la mise en vente sur Delcampe.
          </Text>
          <View style={styles.marketHintBox}>
            <Text style={styles.marketHintLabel}>Recherche generee</Text>
            <Text style={styles.marketHintText}>{marketplaceQuery}</Text>
          </View>

          <TouchableOpacity
            style={styles.marketButton}
            onPress={() => openExternalLink(ebaySearchUrl)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F7F9FC', '#E8EEF7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.marketButtonGradient}
            >
              <View style={[styles.marketIconWrap, { backgroundColor: '#E53238' }]}> 
                <Ionicons name="search" size={18} color="#FFF" />
              </View>
              <View style={styles.marketTextWrap}>
                <Text style={styles.marketButtonTitle}>Trouver le meme sur eBay</Text>
                <Text style={styles.marketButtonSub}>Ouvre une recherche ciblee sur la base de l identification IA</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.marketButton}
            onPress={() => openExternalLink(delcampeSellUrl)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FFF8EB', '#F5E0AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.marketButtonGradient}
            >
              <View style={[styles.marketIconWrap, { backgroundColor: '#C8973A' }]}> 
                <Ionicons name="pricetag-outline" size={18} color="#FFF" />
              </View>
              <View style={styles.marketTextWrap}>
                <Text style={styles.marketButtonTitle}>Vendre le mien sur Delcampe</Text>
                <Text style={styles.marketButtonSub}>Ouvre directement la page de mise en vente Delcampe</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.expertHeader}>
            <View style={styles.expertTitleRow}>
              <Ionicons name="shield-half-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Verification par un pro</Text>
            </View>
            <View style={[styles.expertStatusBadge, { backgroundColor: `${verificationStatusColor}20`, borderColor: verificationStatusColor }]}> 
              <Text style={[styles.expertStatusText, { color: verificationStatusColor }]}>{verificationStatusLabel}</Text>
            </View>
          </View>
          <Text style={styles.expertIntro}>
            Si tu veux une validation humaine, on place cet objet dans la file de revue d un expert pour retour sous 24 h.
          </Text>
          {result.expertVerificationRequestedAt ? (
            <Text style={styles.expertMeta}>
              Demande envoyee le {new Date(result.expertVerificationRequestedAt).toLocaleString('fr-FR')}
            </Text>
          ) : null}
          {result.expertVerificationReport ? (
            <View style={styles.expertReportBox}>
              <Text style={styles.expertReportLabel}>Compte rendu expert</Text>
              <Text style={styles.expertReportText}>{result.expertVerificationReport}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.expertRequestBtn, (isRequestingVerification || result.expertVerificationStatus === 'pending') && { opacity: 0.72 }]}
            onPress={handleRequestVerification}
            activeOpacity={0.85}
            disabled={isRequestingVerification || result.expertVerificationStatus === 'pending'}
          >
            <LinearGradient
              colors={['#1A1A2E', '#2D2D4E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.expertRequestGradient}
            >
              {isRequestingVerification ? (
                <ActivityIndicator size="small" color="#FFD60A" />
              ) : (
                <Ionicons
                  name={result.expertVerificationStatus === 'pending' ? 'time-outline' : canAnalyze ? 'person-outline' : 'lock-closed'}
                  size={20}
                  color="#FFD60A"
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.expertRequestText}>
                  {result.expertVerificationStatus === 'pending'
                    ? 'Verification humaine en attente'
                    : isRequestingVerification
                      ? 'Transmission a l expert...'
                      : 'Demander une verification par un pro'}
                </Text>
                <Text style={styles.expertRequestSub}>
                  {canAnalyze ? 'Relecture humaine et validation sous 24 h' : 'Option payante via le plan Premium'}
                </Text>
              </View>
              {!canAnalyze && result.expertVerificationStatus !== 'pending' && !isRequestingVerification ? (
                <View style={styles.expertPriceTag}>
                  <Text style={styles.expertPriceTagText}>PRO</Text>
                </View>
              ) : null}
            </LinearGradient>
          </TouchableOpacity>
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

        {/* Bouton Analyser */}
        <TouchableOpacity
          style={[styles.analyseBtn, isAnalyzing && { opacity: 0.7 }]}
          onPress={handleAnalyse}
          activeOpacity={0.85}
          disabled={isAnalyzing}
        >
          <LinearGradient
            colors={isOwnerModeActive ? ['#1A1A2E', '#2D2D4E'] : ['#FFD60A', '#E6BE00']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.analyseBtnGradient}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color={isOwnerModeActive ? '#FFD60A' : '#1A1A2E'} />
            ) : (
              <Ionicons name={canAnalyze ? 'sparkles' : 'lock-closed'} size={20} color={isOwnerModeActive ? '#FFD60A' : '#1A1A2E'} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.analyseBtnText, isOwnerModeActive && { color: '#FFD60A' }]}>
                {isAnalyzing ? 'Analyse en cours...' : isOwnerModeActive ? 'Analyse Expert' : 'Analyser cet objet'}
              </Text>
              {isOwnerModeActive && !isPremium && (
                <Text style={[styles.analyseBtnSub, { color: '#FFD60A' }]}>{analysesRemaining} analyse{analysesRemaining > 1 ? 's' : ''} gratuite{analysesRemaining > 1 ? 's' : ''} restante{analysesRemaining > 1 ? 's' : ''}</Text>
              )}
              {!canAnalyze && !isOwnerModeActive && (
                <Text style={styles.analyseBtnSub}>Premium requis</Text>
              )}
            </View>
            {isOwnerModeActive && !isAnalyzing && (
              <View style={styles.freeTag}>
                <Text style={styles.freeTagText}>GRATUIT</Text>
              </View>
            )}
            {!canAnalyze && !isAnalyzing && (
              <View style={styles.priceTag}>
                <Text style={styles.priceTagText}>👑 Pro</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.certificateBtn, isGeneratingCertificate && { opacity: 0.72 }]}
          onPress={handleGenerateCertificate}
          activeOpacity={0.85}
          disabled={isGeneratingCertificate}
        >
          <LinearGradient
            colors={['#FFF9EC', '#F3E2BB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.certificateBtnGradient}
          >
            {isGeneratingCertificate ? (
              <ActivityIndicator size="small" color="#7B5608" />
            ) : (
              <Ionicons name="document-text-outline" size={20} color="#7B5608" />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.certificateBtnText}>
                {isGeneratingCertificate ? 'Generation du certificat...' : 'Generer le certificat PDF'}
              </Text>
              <Text style={styles.certificateBtnSub}>
                Photo, details IA, date du scan, histoire et estimation
              </Text>
            </View>
            {!isGeneratingCertificate && (
              <View style={styles.certificateTag}>
                <Text style={styles.certificateTagText}>PDF</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* QR code */}
        <TouchableOpacity
          style={styles.shareQrBtn}
          onPress={() => setQrVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
          <Text style={styles.shareQrText}>Voir le QR code</Text>
        </TouchableOpacity>

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

      <QRCodeShare
        visible={qrVisible}
        onClose={() => setQrVisible(false)}
        title={`Partager ${result.name}`}
        shareUrl={shareUrl}
      />

      {/* Paywall Modal */}
      <Modal visible={showPaywall} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.paywallOverlay}>
          <View style={styles.paywallSheet}>
            <LinearGradient colors={['#1A1A2E', '#2D2D4E']} style={styles.paywallHeader}>
              <Ionicons name="sparkles" size={36} color="#FFD60A" />
              <Text style={styles.paywallTitle}>{paywallTitle}</Text>
              <Text style={styles.paywallSubtitle}>
                {paywallSubtitle}
              </Text>
            </LinearGradient>

            <View style={styles.paywallFeatures}>
              {paywallFeatures.map((f, i) => (
                <View key={i} style={styles.paywallFeatureRow}>
                  <View style={styles.paywallFeatureIcon}>
                    <Ionicons name={f.icon as any} size={18} color="#FFD60A" />
                  </View>
                  <Text style={styles.paywallFeatureText}>{f.text}</Text>
                </View>
              ))}
            </View>

            {packages.length > 0 ? (
              packages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={styles.paywallBuyBtn}
                  onPress={async () => {
                    const ok = await purchase(pkg);
                    if (!ok) return;
                    setShowPaywall(false);
                    if (paywallAction === 'verification') {
                      requestExpertVerification();
                    } else {
                      triggerAnalysis();
                    }
                  }}
                  activeOpacity={0.85}
                  disabled={rcLoading}
                >
                  <LinearGradient
                    colors={['#FFD60A', '#E6BE00']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.paywallBuyGradient}
                  >
                    {rcLoading ? (
                      <ActivityIndicator color="#1A1A2E" />
                    ) : (
                      <Text style={styles.paywallBuyText}>
                        {pkg.product.title} — {pkg.product.priceString}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.paywallNoPkg}>
                <Text style={styles.paywallNoPkgText}>
                  Abonnement non disponible sur cette plateforme.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.paywallClose}
              onPress={() => setShowPaywall(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.paywallCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  adjustmentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  adjustmentMetaText: { ...typography.small, color: '#D5C691', flex: 1, lineHeight: 16 },
  adjustmentDeltaBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
  },
  adjustmentDeltaPositive: { backgroundColor: 'rgba(45,155,111,0.16)', borderColor: 'rgba(45,155,111,0.45)' },
  adjustmentDeltaNegative: { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.4)' },
  adjustmentDeltaText: { fontSize: 11, fontWeight: '800' },
  adjustmentDeltaTextPositive: { color: '#8AF0BC' },
  adjustmentDeltaTextNegative: { color: '#FFB4B4' },

  sectionTitle: { ...typography.captionBold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  guidedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  guidedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  guidedResetText: { ...typography.smallBold, color: colors.info },
  guidedIntro: { ...typography.body, color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.md },
  guidedGroupLabel: {
    ...typography.smallBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  guidedOptionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  guidedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guidedChipSelected: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  guidedChipText: { ...typography.captionBold, color: colors.textSecondary },
  guidedChipTextSelected: { color: colors.secondary },
  guidedSummaryBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  guidedSummaryLabel: { ...typography.smallBold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  guidedSummaryText: { ...typography.bodyBold, color: colors.secondary, marginBottom: 4 },
  guidedSummarySub: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  detailIcon: { marginRight: spacing.sm },
  detailLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  detailValue: { ...typography.body, color: colors.secondary, fontWeight: '600' },

  marketHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  marketIntro: { ...typography.body, color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.md },
  marketHintBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  marketHintLabel: { ...typography.smallBold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  marketHintText: { ...typography.caption, color: colors.text, lineHeight: 19 },
  marketButton: { borderRadius: borderRadius.xl, overflow: 'hidden', marginTop: spacing.sm },
  marketButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(26,26,46,0.08)',
  },
  marketIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketTextWrap: { flex: 1 },
  marketButtonTitle: { ...typography.bodyBold, color: colors.secondary, marginBottom: 2 },
  marketButtonSub: { ...typography.small, color: colors.textSecondary, lineHeight: 16 },

  expertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  expertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  expertStatusBadge: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  expertStatusText: { fontSize: 11, fontWeight: '700' },
  expertIntro: { ...typography.body, color: colors.textSecondary, lineHeight: 21, marginBottom: spacing.sm },
  expertMeta: { ...typography.small, color: colors.textTertiary, marginBottom: spacing.sm },
  expertReportBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  expertReportLabel: { ...typography.smallBold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  expertReportText: { ...typography.caption, color: colors.text, lineHeight: 19 },
  expertRequestBtn: { borderRadius: borderRadius.xl, overflow: 'hidden', marginTop: spacing.sm },
  expertRequestGradient: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  expertRequestText: { ...typography.bodyBold, color: '#FFD60A', fontSize: 16 },
  expertRequestSub: { fontSize: 11, color: '#D5C691', marginTop: 2 },
  expertPriceTag: { backgroundColor: '#FFD60A', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  expertPriceTagText: { fontSize: 11, fontWeight: '800', color: '#1A1A2E', letterSpacing: 0.5 },

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

  shareQrBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#FFF',
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  shareQrText: { ...typography.bodyBold, color: colors.primary },

  newScanBtn: { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden' },
  newScanGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  newScanText: { ...typography.bodyBold, color: '#FFF', fontSize: 16 },

  // Bouton Analyser
  analyseBtn: { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden' },
  analyseBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  analyseBtnText: { ...typography.bodyBold, color: '#1A1A2E', fontSize: 16, flex: 1 },
  analyseBtnSub: { fontSize: 11, color: '#1A1A2E', opacity: 0.65, marginTop: 1 },
  priceTag: { backgroundColor: '#1A1A2E', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  priceTagText: { fontSize: 11, fontWeight: '700', color: '#FFD60A' },
  freeTag: { backgroundColor: '#2D9B6F', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  freeTagText: { fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  certificateBtn: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: borderRadius.xl, overflow: 'hidden' },
  certificateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,151,58,0.35)',
  },
  certificateBtnText: { ...typography.bodyBold, color: '#7B5608', fontSize: 16 },
  certificateBtnSub: { fontSize: 11, color: '#8B6A28', marginTop: 1, lineHeight: 15 },
  certificateTag: { backgroundColor: '#7B5608', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  certificateTagText: { fontSize: 11, fontWeight: '800', color: '#FFF4D1', letterSpacing: 0.5 },

  // Paywall Modal
  paywallOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  paywallSheet: { backgroundColor: '#F8F8F2', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingBottom: 34 },
  paywallHeader: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  paywallTitle: { fontSize: 22, fontWeight: '800', color: '#FFD60A', textAlign: 'center' },
  paywallSubtitle: { fontSize: 14, color: '#A0A0C0', textAlign: 'center', lineHeight: 20 },
  paywallFeatures: { padding: spacing.lg, gap: spacing.sm },
  paywallFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  paywallFeatureIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  paywallFeatureText: { ...typography.body, color: '#1A1A2E', flex: 1 },
  paywallBuyBtn: { marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: borderRadius.xl, overflow: 'hidden' },
  paywallBuyGradient: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  paywallBuyText: { ...typography.bodyBold, color: '#1A1A2E', fontSize: 16 },
  paywallNoPkg: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, backgroundColor: '#FFF0C8', borderRadius: borderRadius.lg },
  paywallNoPkgText: { ...typography.body, color: '#8B5C00', textAlign: 'center' },
  paywallClose: { marginTop: spacing.lg, alignItems: 'center' },
  paywallCloseText: { ...typography.body, color: colors.textSecondary },
});
