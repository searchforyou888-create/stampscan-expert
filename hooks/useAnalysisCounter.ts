import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRevenueCat } from './useRevenueCat';
import { useAuth } from './useAuth';

const OWNER_FREE_ANALYSES_LIMIT = 10;
const STORAGE_KEY = 'collectscan_owner_free_analyses_used';

export function useAnalysisCounter() {
  const [analysesUsed, setAnalysesUsed] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isPremium } = useRevenueCat();
  const { isOwnerModeActive } = useAuth();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setAnalysesUsed(val ? parseInt(val, 10) : 0);
      setIsLoaded(true);
    });
  }, []);

  const analysesRemaining = Math.max(0, OWNER_FREE_ANALYSES_LIMIT - analysesUsed);
  const hasFreeAnalysis = analysesRemaining > 0;

  const incrementAnalysis = useCallback(async () => {
    const next = analysesUsed + 1;
    setAnalysesUsed(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
  }, [analysesUsed]);

  const canAnalyze = isPremium || (isOwnerModeActive && hasFreeAnalysis);

  return {
    analysesUsed,
    analysesRemaining,
    analysisLimit: OWNER_FREE_ANALYSES_LIMIT,
    hasFreeAnalysis,
    isPremium,
    isOwnerModeActive,
    canAnalyze,
    isLoaded,
    incrementAnalysis,
  };
}
