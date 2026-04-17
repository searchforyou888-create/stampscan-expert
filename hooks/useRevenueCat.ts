import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { useAuth } from '@/hooks/useAuth';

const ENTITLEMENT_ID = 'premium';

let initialized = false;
let configuredAppUserId: string | null = null;

function getRevenueCatApiKey() {
  const extra = Constants.expoConfig?.extra ?? {};

  if (Platform.OS === 'ios') {
    return extra.revenueCatAppleApiKey || extra.revenueCatApiKey || '';
  }

  if (Platform.OS === 'android') {
    return extra.revenueCatGoogleApiKey || extra.revenueCatApiKey || '';
  }

  return extra.revenueCatWebApiKey || extra.revenueCatApiKey || '';
}

function formatRevenueCatError(error: any) {
  const message = error?.message || String(error) || 'Paiement impossible';

  if (message.includes('API key') || message.includes('api key') || message.includes('Configuration')) {
    return 'Configuration RevenueCat invalide. Ajoutez une cle publique SDK dans vos variables d environnement.';
  }

  if (message.includes('Network') || message.includes('fetch')) {
    return 'Connexion au service de paiement impossible. Reessayez dans un instant.';
  }

  return message;
}

async function initRC(appUserID?: string) {
  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    throw new Error('RevenueCat API key missing');
  }

  if (!initialized) {
    Purchases.configure({ apiKey, appUserID });
    initialized = true;
    configuredAppUserId = appUserID ?? null;
    return;
  }

  if (appUserID && configuredAppUserId !== appUserID) {
    await Purchases.logIn(appUserID);
    configuredAppUserId = appUserID;
    return;
  }

  if (!appUserID && configuredAppUserId) {
    await Purchases.logOut();
    configuredAppUserId = null;
  }
}

export function useRevenueCat() {
  const { isAuthenticated, isReady, user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let listener: ((info: CustomerInfo) => void) | null = null;

    if (!isReady) {
      return;
    }

    async function init() {
      if (!isAuthenticated || !user?.id) {
        if (isMounted) {
          setIsPremium(false);
          setPackages([]);
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        await initRC(user.id);

        const [customerInfo, offerings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);

        if (!isMounted) {
          return;
        }

        setIsPremium(!!customerInfo.entitlements.active[ENTITLEMENT_ID]);
        setPackages(offerings.current?.availablePackages || []);

        listener = (info: CustomerInfo) => {
          if (!isMounted) {
            return;
          }

          setIsPremium(!!info.entitlements.active[ENTITLEMENT_ID]);
        };
        Purchases.addCustomerInfoUpdateListener(listener);
      } catch (err: any) {
        console.error('[RevenueCat] Init error:', err?.message);
        if (isMounted) {
          setPackages([]);
          setError(formatRevenueCatError(err));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      if (listener) {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [isAuthenticated, isReady, user?.id]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      setIsLoading(true);
      setError(null);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasPremium = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(hasPremium);
      return hasPremium;
    } catch (err: any) {
      if (!err.userCancelled) {
        setError(formatRevenueCatError(err));
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(hasPremium);
      return hasPremium;
    } catch (err: any) {
      setError(formatRevenueCatError(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { isPremium, packages, isLoading, error, purchase, restore, clearError };
}
