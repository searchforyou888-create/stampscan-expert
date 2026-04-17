import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRevenueCat } from './useRevenueCat';
import { useAuth } from './useAuth';

const CLIENT_FREE_SCANS_LIMIT = 3;
const OWNER_FREE_SCANS_LIMIT = 20;
const CLIENT_STORAGE_KEY = 'collectscan_client_free_scans_used';
const OWNER_STORAGE_KEY = 'collectscan_owner_free_scans_used';

export function useScanCounter() {
  const [scansUsed, setScansUsed] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isPremium } = useRevenueCat();
  const { isOwnerModeActive } = useAuth();

  const scanLimit = isOwnerModeActive ? OWNER_FREE_SCANS_LIMIT : CLIENT_FREE_SCANS_LIMIT;
  const storageKey = isOwnerModeActive ? OWNER_STORAGE_KEY : CLIENT_STORAGE_KEY;

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((val) => {
      setScansUsed(val ? parseInt(val, 10) : 0);
      setIsLoaded(true);
    });
  }, [storageKey]);

  const scansRemaining = Math.max(0, scanLimit - scansUsed);
  const hasFreeScan = scansRemaining > 0;

  const incrementScan = useCallback(async () => {
    const next = scansUsed + 1;
    setScansUsed(next);
    await AsyncStorage.setItem(storageKey, String(next));
  }, [scansUsed, storageKey]);

  const canScan = isPremium || hasFreeScan;

  return {
    scansUsed,
    scansRemaining,
    scanLimit,
    hasFreeScan,
    isPremium,
    isOwnerModeActive,
    canScan,
    isLoaded,
    incrementScan,
    FREE_SCANS_LIMIT: scanLimit,
    CLIENT_FREE_SCANS_LIMIT,
    OWNER_FREE_SCANS_LIMIT,
  };
}
