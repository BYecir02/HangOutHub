import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import type { TranslationKey } from '@/services/i18n';
import {
  canAccessOrganizerPanel,
  getOrganizerAccessDenialReason,
  type OrganizerAccessDenialReason,
  type OrganizerAccessUser,
} from '@/services/organizer-access';

interface UseOrganizerGuardOptions {
  user?: OrganizerAccessUser | null;
  loading: boolean;
  suspend?: boolean;
}

function getGuardCopy(
  reason: OrganizerAccessDenialReason,
  t: (key: TranslationKey) => string,
): { title: string; message: string; target: '/(tabs)/home' | '/(tabs)/profile' } {
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
}: UseOrganizerGuardOptions): boolean {
  const router = useRouter();
  const { t } = useI18n();
  const hasRedirectedRef = useRef(false);

  const isAllowed = canAccessOrganizerPanel(user);

  useEffect(() => {
    if (suspend || loading || isAllowed || hasRedirectedRef.current) {
      return;
    }

    const reason = getOrganizerAccessDenialReason(user);

    if (!reason) {
      return;
    }

    hasRedirectedRef.current = true;

    const { title, message, target } = getGuardCopy(reason, t);

    Alert.alert(title, message, [
      {
        text: t('organizerGuardActionOk'),
        onPress: () => router.replace(target),
      },
    ]);

    const fallbackRedirect = setTimeout(() => {
      router.replace(target);
    }, 500);

    return () => {
      clearTimeout(fallbackRedirect);
    };
  }, [isAllowed, loading, router, suspend, t, user]);

  return isAllowed;
}
