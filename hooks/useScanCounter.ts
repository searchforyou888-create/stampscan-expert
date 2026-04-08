import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FREE_SCANS_LIMIT = 10;
const STORAGE_KEY = 'collectscan_free_scans_used';

export function useScanCounter() {
  const [scansUsed, setScansUsed] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setScansUsed(val ? parseInt(val, 10) : 0);
      setIsLoaded(true);
    });
  }, []);

  const scansRemaining = Math.max(0, FREE_SCANS_LIMIT - scansUsed);
  const hasFreeScan = scansRemaining > 0;
  const isPremium = false; // Will be true when RevenueCat is connected

  const incrementScan = useCallback(async () => {
    const next = scansUsed + 1;
    setScansUsed(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
  }, [scansUsed]);

  const canScan = isPremium || hasFreeScan;

  return {
    scansUsed,
    scansRemaining,
    hasFreeScan,
    isPremium,
    canScan,
    isLoaded,
    incrementScan,
    FREE_SCANS_LIMIT,
  };
}
