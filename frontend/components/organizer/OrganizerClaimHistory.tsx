import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import ScreenState from '@/components/ui/ScreenState';
import { useI18n } from '@/hooks/use-i18n';
import { clearAuthState, getApiErrorMessage, getImageUrl } from '@/services/api';
import { listMyPlaceClaims, type PlaceClaimItem } from '@/services/place-claims';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

type ClaimStatusTone = {
  bg: string;
  text: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}

function formatClaimDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getClaimStatusTone(status: string | null | undefined, t: ReturnType<typeof useI18n>['t']): ClaimStatusTone {
  const normalized = (status || 'PENDING').toUpperCase();

  if (normalized === 'APPROVED') {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      label: t('organizerProfileClaimsStatusApproved'),
      icon: 'checkmark-circle-outline',
      iconColor: '#059669',
    };
  }

  if (normalized === 'REJECTED') {
    return {
      bg: 'bg-rose-100 dark:bg-rose-900/30',
      text: 'text-rose-700 dark:text-rose-300',
      label: t('organizerProfileClaimsStatusRejected'),
      icon: 'close-circle-outline',
      iconColor: '#e11d48',
    };
  }

  return {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    label: t('organizerProfileClaimsStatusPending'),
    icon: 'time-outline',
    iconColor: '#d97706',
  };
}

function OrganizerClaimCard({
  claim,
  t,
  locale,
  onOpenPlace,
  onOpenWorkspace,
  onRetryClaim,
}: {
  claim: PlaceClaimItem;
  t: ReturnType<typeof useI18n>['t'];
  locale: string;
  onOpenPlace: (placeId: string) => void;
  onOpenWorkspace: (placeId: string) => void;
  onRetryClaim: (placeId: string) => void;
}) {
  const statusTone = getClaimStatusTone(claim.status, t);
  const locationLabel = [claim.Place.City?.name, claim.Place.City?.country]
    .filter(Boolean)
    .join(' - ');
  const dateLabel = formatClaimDate(
    (claim.status || 'PENDING').toUpperCase() === 'PENDING'
      ? claim.createdAt
      : claim.updatedAt || claim.createdAt,
    locale,
  );

  const normalizedStatus = (claim.status || 'PENDING').toUpperCase();
  const action =
    normalizedStatus === 'APPROVED'
      ? {
          label: t('organizerProfileClaimsOpenWorkspace'),
          onPress: () => onOpenWorkspace(claim.placeId),
        }
      : normalizedStatus === 'REJECTED'
        ? {
            label: t('organizerProfileClaimsRetry'),
            onPress: () => onRetryClaim(claim.placeId),
          }
        : {
            label: t('organizerProfileClaimsOpenPlace'),
            onPress: () => onOpenPlace(claim.placeId),
          };

  return (
    <View className="mb-3 rounded-[24px] bg-white p-3 dark:bg-gray-900">
      <View className="flex-row">
        <Image
          source={{ uri: getImageUrl(claim.Place.coverUrl) || PLACE_PLACEHOLDER }}
          className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
        />
        <View className="ml-4 flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {claim.Place.name}
              </Text>
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {locationLabel || t('homeLocationToConfirm')}
              </Text>
            </View>
            <View className={`self-start rounded-full px-3 py-1 ${statusTone.bg}`}>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name={statusTone.icon} size={12} color={statusTone.iconColor} />
                <Text className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone.text}`}>
                  {statusTone.label}
                </Text>
              </View>
            </View>
          </View>

          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {normalizedStatus === 'PENDING'
              ? t('organizerProfileClaimsSentAt', { date: dateLabel || '-' })
              : t('organizerProfileClaimsUpdatedAt', { date: dateLabel || '-' })}
          </Text>

          <TouchableOpacity
            onPress={action.onPress}
            className="mt-3 self-start rounded-full bg-[#4c669f]/10 px-4 py-2"
          >
            <Text className="text-xs font-semibold text-[#4c669f]">
              {action.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function OrganizerClaimHistory() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [claims, setClaims] = useState<PlaceClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const loadClaims = useCallback(async () => {
    const showLoader = !hasLoadedRef.current;

    if (showLoader) {
      setLoading(true);
    }

    setError(null);

    try {
      const nextClaims = await listMyPlaceClaims();
      setClaims(nextClaims);
      hasLoadedRef.current = true;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await clearAuthState();
        router.replace('/');
        return;
      }

      if (showLoader) {
        setClaims([]);
        setError(getApiErrorMessage(error, t('organizerProfileClaimsLoadFailed')));
      } else if (__DEV__) {
        console.warn('[OrganizerClaimHistory] refresh failed', error);
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [router, t]);

  useFocusEffect(
    useCallback(() => {
      void loadClaims();
    }, [loadClaims]),
  );

  if (loading && claims.length === 0) {
    return (
      <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
        <View className="flex-row items-end justify-between">
          <View className="flex-1">
            <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              {t('organizerProfileClaimsLabel')}
            </Text>
            <Text className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
              {t('organizerProfileClaimsTitle')}
            </Text>
            <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('organizerProfileClaimsSubtitle')}
            </Text>
          </View>
        </View>
        <View className="mt-6 items-center py-4">
          <ActivityIndicator size="large" color="#4c669f" />
          <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t('organizerProfileClaimsLoading')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
      <View className="flex-row items-end justify-between gap-4">
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {t('organizerProfileClaimsLabel')}
          </Text>
          <Text className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
            {t('organizerProfileClaimsTitle')}
          </Text>
          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('organizerProfileClaimsSubtitle')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/organizer/place-onboarding')}
          className="rounded-full bg-[#4c669f]/10 px-4 py-2"
        >
          <Text className="text-xs font-semibold text-[#4c669f]">
            {t('organizerPlaceOnboardingClaimAction')}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View className="mt-5">
          <ScreenState
            mode="error"
            title={t('commonErrorTitle')}
            description={error}
            actionLabel={t('commonRetry')}
            onAction={() => {
              void loadClaims();
            }}
            containerClassName="px-0 py-2"
            variant="card"
          />
        </View>
      ) : claims.length === 0 ? (
        <View className="mt-5">
          <ScreenState
            mode="empty"
            title={t('organizerProfileClaimsEmptyTitle')}
            description={t('organizerProfileClaimsEmptyDescription')}
            actionLabel={t('organizerPlaceOnboardingClaimAction')}
            onAction={() => router.push('/organizer/place-onboarding')}
            containerClassName="px-0 py-2"
            variant="card"
          />
        </View>
      ) : (
        <View className="mt-5">
          {claims.map((claim) => (
            <OrganizerClaimCard
              key={claim.id}
              claim={claim}
              t={t}
              locale={locale}
              onOpenPlace={(placeId) =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: placeId },
                })
              }
              onOpenWorkspace={(placeId) =>
                router.push({
                  pathname: '/organizer/place-profile/[id]',
                  params: { id: placeId },
                })
              }
              onRetryClaim={(placeId) =>
                router.push({
                  pathname: '/organizer/claim-place',
                  params: { placeId },
                })
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

