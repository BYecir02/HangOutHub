import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import type { TranslationKey } from '@/services/i18n';
import {
  canAccessOrganizerCapability,
  canAccessOrganizerPanel,
  type OrganizerCapability,
  getOrganizerAccessDenialReason,
  getOrganizerEntryPath,
  type OrganizerAccessDenialReason,
  type OrganizerAccessUser,
} from '@/services/organizer-access';

interface UseOrganizerGuardOptions {
  user?: OrganizerAccessUser | null;
  loading: boolean;
  suspend?: boolean;
  requiredCapability?: OrganizerCapability;
}

function getGuardCopy(
  reason: OrganizerAccessDenialReason,
  t: (key: TranslationKey) => string,
): { title: string; message: string; target: string } {
  if (reason === 'PENDING') {
    return {
      title: t('organizerGuardPendingTitle'),
      message: t('organizerGuardPendingMessage'),
      target: '/(tabs)/profile',
    };
  }

  if (reason === 'REJECTED') {
    return {
      title: t('organizerGuardRejectedTitle'),
      message: t('organizerGuardRejectedMessage'),
      target: '/(tabs)/profile',
    };
  }

  if (reason === 'SUSPENDED') {
    return {
      title: t('organizerGuardSuspendedTitle'),
      message: t('organizerGuardSuspendedMessage'),
      target: '/(tabs)/profile',
    };
  }

  return {
    title: t('organizerGuardNotAllowedTitle'),
    message: t('organizerGuardNotAllowedMessage'),
    target: '/(tabs)/home',
  };
}

export function useOrganizerGuard({
  user,
  loading,
  suspend = false,
  requiredCapability = 'dashboard',
}: UseOrganizerGuardOptions): boolean {
  const router = useRouter();
  const { t } = useI18n();
  const hasRedirectedRef = useRef(false);

  const hasPanelAccess = canAccessOrganizerPanel(user);
  const isAllowed = canAccessOrganizerCapability(user, requiredCapability);

  useEffect(() => {
    if (suspend || loading || isAllowed || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    const reason = getOrganizerAccessDenialReason(user);
    const entryPath = getOrganizerEntryPath(user);
    const fallbackCopy = {
      title: t('organizerGuardNotAllowedTitle'),
      message: t('organizerGuardNotAllowedMessage'),
      target: entryPath,
    };
    const { title, message, target } =
      hasPanelAccess && !reason
        ? fallbackCopy
        : reason
          ? getGuardCopy(reason, t)
          : fallbackCopy;

    Alert.alert(title, message, [
      {
        text: t('organizerGuardActionOk'),
        onPress: () => router.replace(target as never),
      },
    ]);

    const fallbackRedirect = setTimeout(() => {
      router.replace(target as never);
    }, 500);

    return () => {
      clearTimeout(fallbackRedirect);
    };
  }, [hasPanelAccess, isAllowed, loading, router, suspend, t, user]);

  return isAllowed;
}
