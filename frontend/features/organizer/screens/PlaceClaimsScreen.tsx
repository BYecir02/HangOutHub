import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import AdminAnalyticsPanel from '@/components/admin/AdminAnalyticsPanel';
import { useI18n } from '@/hooks/use-i18n';
import { useUserProfile } from '@/hooks/useUserProfile';
import { clearAuthState, getApiErrorMessage, getImageUrl } from '@/services/api';
import { deleteAdminUser, listAdminUsers, type AdminUserSummary } from '@/services/admin-users';
import {
  getAdminOrganizerProfile,
  listAdminOrganizerProfiles,
  updateAdminOrganizerStatus,
  type AdminOrganizerDetail,
  type AdminOrganizerStatus,
  type AdminOrganizerSummary,
} from '@/services/admin-organizers';
import { formatOrganizerDateTime, getOrganizerStatusTone } from '@/services/organizer-ui';
import {
  listPlaceClaims,
  updatePlaceClaimStatus,
  type PlaceClaimItem,
} from '@/services/place-claims';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';
type BackofficeSection = 'claims' | 'organizers' | 'analytics' | 'users';

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}

function getStatusTone(status?: string | null) {
  const normalized = (status || 'PENDING').toUpperCase();

  if (normalized === 'APPROVED') {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      label: 'APPROVED',
    };
  }

  if (normalized === 'REJECTED') {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      label: 'REJECTED',
    };
  }

  return {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'PENDING',
  };
}

function ClaimCard({
  claim,
  onApprove,
  onReject,
  onOpenDocument,
  t,
  approving,
  rejecting,
}: {
  claim: PlaceClaimItem;
  onApprove: (claimId: string) => void;
  onReject: (claimId: string) => void;
  onOpenDocument: (documentUrl: string) => void;
  t: ReturnType<typeof useI18n>['t'];
  approving: boolean;
  rejecting: boolean;
}) {
  const statusTone = getStatusTone(claim.status);
  const locationLabel = [claim.Place.City?.name, claim.Place.City?.country]
    .filter(Boolean)
    .join(' - ');

  return (
    <View className="mb-4 rounded-[28px] bg-white p-3 dark:bg-gray-900">
      <View className="flex-row">
        <Image
          source={{ uri: getImageUrl(claim.Place.coverUrl) || PLACE_PLACEHOLDER }}
          className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
        />
        <View className="ml-4 flex-1">
          <View className="flex-row items-center justify-between">
            <View
              className={`self-start rounded-full px-3 py-1 ${statusTone.bg}`}
            >
              <Text className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone.text}`}>
                {statusTone.label}
              </Text>
            </View>
          </View>
          <Text className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
            {claim.Place.name}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {locationLabel || t('placeDetailCityUnknown')}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {claim.User?.displayName || claim.User?.username || claim.userId}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => onOpenDocument(claim.documentUrl)}
        className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
      >
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {t('adminPlaceClaimsOpenDocument')}
        </Text>
      </TouchableOpacity>

      <View className="mt-3 flex-row gap-3">
        <TouchableOpacity
          onPress={() => onReject(claim.id)}
          disabled={rejecting || approving}
          className="flex-1 items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-900/20"
          style={{ opacity: rejecting || approving ? 0.7 : 1 }}
        >
          <Text className="text-sm font-semibold text-red-600">
            {t('adminPlaceClaimsReject')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onApprove(claim.id)}
          disabled={approving || rejecting}
          className="flex-1 items-center rounded-2xl bg-emerald-600 px-4 py-3"
          style={{ opacity: approving || rejecting ? 0.7 : 1 }}
        >
          <Text className="text-sm font-semibold text-white">
            {t('adminPlaceClaimsApprove')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getOrganizerStatusLabel(
  status: AdminOrganizerStatus | string | null | undefined,
  t: ReturnType<typeof useI18n>['t'],
) {
  const normalized = (status || 'PENDING').toUpperCase();

  if (normalized === 'APPROVED') {
    return t('adminOrganizerStatusApproved');
  }

  if (normalized === 'REJECTED') {
    return t('adminOrganizerStatusRejected');
  }

  if (normalized === 'SUSPENDED') {
    return t('adminOrganizerStatusSuspended');
  }

  return t('adminOrganizerStatusPending');
}

function getAccountTypeLabel(
  accountType?: string | null,
  t?: ReturnType<typeof useI18n>['t'],
) {
  if ((accountType || '').toUpperCase() === 'PLACE') {
    return t ? t('registerRolePlaceTitle') : 'PLACE';
  }

  if ((accountType || '').toUpperCase() === 'NOMAD') {
    return t ? t('registerRoleNomadTitle') : 'NOMAD';
  }

  return accountType || '-';
}

function maskSensitiveValue(value?: string | null) {
  if (!value) {
    return '-';
  }

  if (value.length <= 4) {
    return '****';
  }

  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

function OrganizerSummaryCard({
  organizer,
  onPress,
  t,
  locale,
}: {
  organizer: AdminOrganizerSummary;
  onPress: (id: string) => void;
  t: ReturnType<typeof useI18n>['t'];
  locale: string;
}) {
  const statusTone = getOrganizerStatusTone(
    organizer.organizer?.status || 'PENDING',
  );
  const accountType = getAccountTypeLabel(organizer.organizer?.accountType, t);
  const createdAt = organizer.organizer?.createdAt
    ? formatOrganizerDateTime(organizer.organizer.createdAt, locale)
    : '';

  return (
    <TouchableOpacity
      onPress={() => onPress(organizer.id)}
      className="mb-4 rounded-[28px] border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {organizer.organizer?.companyName || organizer.displayName || organizer.username}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {organizer.username ? `@${organizer.username}` : organizer.email || '-'}
          </Text>
          <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {accountType} - {organizer.organizer?.jobTitle || t('profileOrganizerRoleFallback')}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1.5 ${statusTone.bg}`}>
          <Text className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone.text}`}>
            {getOrganizerStatusLabel(organizer.organizer?.status, t)}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between gap-3">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {t('adminOrganizerApplicationsFieldPlaces')}: {organizer.placesCount}
        </Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500">
          {createdAt || '-'}
        </Text>
      </View>

      <View className="mt-4 self-start rounded-full bg-[#4c669f]/10 px-4 py-2">
        <Text className="text-xs font-semibold text-[#4c669f]">
          {t('adminOrganizerApplicationsSelectCta')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function OrganizerDetailField({
  label,
  value,
  secure,
  revealed,
  t,
  onPress,
}: {
  label: string;
  value: string;
  secure?: boolean;
  revealed?: boolean;
  t: ReturnType<typeof useI18n>['t'];
  onPress?: () => void;
}) {
  return (
    <View className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800">
      <Text className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100" numberOfLines={secure && !revealed ? 1 : undefined}>
        {secure && !revealed ? maskSensitiveValue(value) : value || '-'}
      </Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress} className="mt-2 self-start rounded-full bg-white px-3 py-1.5 dark:bg-gray-900">
          <Text className="text-[11px] font-semibold text-[#4c669f]">
            {revealed
              ? t('adminOrganizerApplicationsHideSensitive')
              : t('adminOrganizerApplicationsRevealSensitive')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function OrganizerDetailCard({
  organizer,
  locale,
  t,
  revealed,
  onToggleReveal,
  onApprove,
  onReject,
  onSuspend,
  busy,
  onOpenPlace,
}: {
  organizer: AdminOrganizerDetail;
  locale: string;
  t: ReturnType<typeof useI18n>['t'];
  revealed: boolean;
  onToggleReveal: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSuspend: (id: string) => void;
  busy: boolean;
  onOpenPlace?: (placeId: string) => void;
}) {
  const statusTone = getOrganizerStatusTone(
    organizer.organizer?.status || 'PENDING',
  );
  const socialLinks = [
    organizer.organizer?.instagramUrl
      ? { label: 'Instagram', value: organizer.organizer.instagramUrl }
      : null,
    organizer.organizer?.tiktokUrl
      ? { label: 'TikTok', value: organizer.organizer.tiktokUrl }
      : null,
    organizer.organizer?.facebookUrl
      ? { label: 'Facebook', value: organizer.organizer.facebookUrl }
      : null,
    organizer.organizer?.xUrl ? { label: 'X', value: organizer.organizer.xUrl } : null,
    organizer.organizer?.websiteUrl
      ? { label: t('registerWebsiteLabel'), value: organizer.organizer.websiteUrl }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <View className="mt-4 rounded-[28px] border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {t('adminOrganizerApplicationsDetailsTitle')}
          </Text>
          <Text className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {organizer.organizer?.companyName || organizer.displayName || organizer.username}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {organizer.email || organizer.username ? `${organizer.email || organizer.username}` : '-'}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1.5 ${statusTone.bg}`}>
          <Text className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone.text}`}>
            {getOrganizerStatusLabel(organizer.organizer?.status, t)}
          </Text>
        </View>
      </View>

      <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t('adminOrganizerApplicationsDetailsSubtitle')}
      </Text>

      <View className="mt-5 gap-3">
        <OrganizerDetailField
          label={t('adminOrganizerApplicationsFieldAccountType')}
          value={getAccountTypeLabel(organizer.organizer?.accountType, t)}
          t={t}
        />
        <OrganizerDetailField
          label={t('adminOrganizerApplicationsFieldCompanyName')}
          value={organizer.organizer?.companyName || organizer.displayName || '-'}
          t={t}
        />
        <OrganizerDetailField
          label={t('adminOrganizerApplicationsFieldJobTitle')}
          value={organizer.organizer?.jobTitle || t('profileOrganizerRoleFallback')}
          t={t}
        />
        <OrganizerDetailField
          label={t('adminOrganizerApplicationsFieldEmail')}
          value={organizer.email || '-'}
          t={t}
        />
        <OrganizerDetailField
          label={t('adminOrganizerApplicationsFieldIfu')}
          value={organizer.organizer?.ifuNumber || '-'}
          secure
          revealed={revealed}
          t={t}
          onPress={onToggleReveal}
        />
        <OrganizerDetailField
          label={t('adminOrganizerApplicationsFieldPayout')}
          value={organizer.organizer?.payoutInfo || '-'}
          secure
          revealed={revealed}
          t={t}
          onPress={onToggleReveal}
        />
        <OrganizerDetailField
          label={t('adminOrganizerApplicationsFieldPlaces')}
          value={`${organizer.placesCount}`}
          t={t}
        />
        <OrganizerDetailField
          label={t('adminOrganizerApplicationsFieldCreatedAt')}
          value={
            organizer.organizer?.createdAt
              ? formatOrganizerDateTime(organizer.organizer.createdAt, locale)
              : '-'
          }
          t={t}
        />
        <OrganizerDetailField
          label={t('adminOrganizerApplicationsFieldUpdatedAt')}
          value={
            organizer.organizer?.updatedAt
              ? formatOrganizerDateTime(organizer.organizer.updatedAt, locale)
              : '-'
          }
          t={t}
        />
      </View>

      {socialLinks.length > 0 ? (
        <View className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
          <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {t('adminOrganizerApplicationsFieldSocials')}
          </Text>
          <View className="mt-3 gap-2">
            {socialLinks.map((link) => (
              <TouchableOpacity
                key={link.label}
                onPress={() => {
                  void Linking.openURL(link.value);
                }}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900"
              >
                <Text className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  {link.label}
                </Text>
                <Text className="mt-1 text-sm font-semibold text-[#4c669f]" numberOfLines={1}>
                  {link.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

        {organizer.OwnedPlaces && organizer.OwnedPlaces.length > 0 ? (
          <View className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
            <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              {t('adminOrganizerApplicationsFieldPlaces')}
            </Text>
            <View className="mt-3 gap-2">
              {organizer.OwnedPlaces.map((place) => (
              <TouchableOpacity
                key={place.id}
                onPress={() => onOpenPlace?.(place.id)}
                className="flex-row items-center rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
              >
                <Image
                  source={{ uri: getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER }}
                  className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-800"
                />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                    {place.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {place.City?.name || place.address || t('homeAddressToConfirm')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-3">
        <TouchableOpacity
          onPress={() => onReject(organizer.id)}
          disabled={busy}
          className="flex-1 items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-900/20"
          style={{ opacity: busy ? 0.7 : 1 }}
        >
          <Text className="text-sm font-semibold text-red-600">
            {t('adminOrganizerApplicationsReject')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onSuspend(organizer.id)}
          disabled={busy}
          className="flex-1 items-center rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/40 dark:bg-orange-900/20"
          style={{ opacity: busy ? 0.7 : 1 }}
        >
          <Text className="text-sm font-semibold text-orange-600">
            {t('adminOrganizerApplicationsSuspend')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onApprove(organizer.id)}
          disabled={busy}
          className="flex-1 items-center rounded-2xl bg-emerald-600 px-4 py-3"
          style={{ opacity: busy ? 0.7 : 1 }}
        >
          <Text className="text-sm font-semibold text-white">
            {t('adminOrganizerApplicationsApprove')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onToggleReveal}
        className="mt-4 self-start rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-800"
      >
        <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          {revealed
            ? t('adminOrganizerApplicationsHideSensitive')
            : t('adminOrganizerApplicationsRevealSensitive')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function getUserStatusTone(isSuspended?: boolean | null) {
  if (isSuspended) {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      label: 'SUSPENDED',
    };
  }

  return {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'ACTIVE',
  };
}

function AdminUserCard({
  user,
  onDelete,
  deleting,
  t,
}: {
  user: AdminUserSummary;
  onDelete: (id: string) => void;
  deleting: boolean;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const statusTone = getUserStatusTone(user.isSuspended);
  const displayName =
    user.displayName || user.username || user.email || t('adminUsersUnknown');

  return (
    <View className="mb-4 rounded-[28px] border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {displayName}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {user.email || '-'}
          </Text>
          <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {t('adminUsersRoleLabel')}: {user.role || 'USER'}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1.5 ${statusTone.bg}`}>
          <Text className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone.text}`}>
            {user.isSuspended ? t('adminUsersStatusSuspended') : t('adminUsersStatusActive')}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => onDelete(user.id)}
        disabled={deleting}
        className="mt-4 items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-900/20"
        style={{ opacity: deleting ? 0.7 : 1 }}
      >
        <Text className="text-sm font-semibold text-red-600">
          {t('adminUsersDeleteCta')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AdminPlaceClaimsScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { user, loading, error, refetch } = useUserProfile();
  const [claims, setClaims] = useState<PlaceClaimItem[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [actionClaimId, setActionClaimId] = useState<string | null>(null);
  const [organizers, setOrganizers] = useState<AdminOrganizerSummary[]>([]);
  const [organizersLoading, setOrganizersLoading] = useState(true);
  const [organizersError, setOrganizersError] = useState<string | null>(null);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
  const [selectedOrganizerDetail, setSelectedOrganizerDetail] =
    useState<AdminOrganizerDetail | null>(null);
  const [organizerDetailLoading, setOrganizerDetailLoading] = useState(false);
  const [organizerDetailError, setOrganizerDetailError] = useState<string | null>(null);
  const [actionOrganizerId, setActionOrganizerId] = useState<string | null>(null);
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [activeSection, setActiveSection] = useState<BackofficeSection>('claims');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const loadClaims = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setClaimsLoading(true);
    setClaimsError(null);

    try {
      const nextClaims = await listPlaceClaims();
      setClaims(nextClaims);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await clearAuthState();
        router.replace('/');
        return;
      }

      setClaims([]);
      setClaimsError(getApiErrorMessage(error, t('adminPlaceClaimsLoadFailed')));
    } finally {
      setClaimsLoading(false);
    }
  }, [isAdmin, router, t]);

  const loadOrganizers = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setOrganizersLoading(true);
    setOrganizersError(null);

    try {
      const nextOrganizers = await listAdminOrganizerProfiles();
      setOrganizers(nextOrganizers);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await clearAuthState();
        router.replace('/');
        return;
      }

      setOrganizers([]);
      setOrganizersError(getApiErrorMessage(error, t('adminOrganizerApplicationsLoadFailed')));
    } finally {
      setOrganizersLoading(false);
    }
  }, [isAdmin, router, t]);

  const loadOrganizerDetail = useCallback(
    async (userId: string) => {
      if (!isAdmin) {
        return;
      }

      setOrganizerDetailLoading(true);
      setOrganizerDetailError(null);

      try {
        const detail = await getAdminOrganizerProfile(userId);
        setSelectedOrganizerDetail(detail);
        setRevealSensitive(false);
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await clearAuthState();
          router.replace('/');
          return;
        }

        setSelectedOrganizerDetail(null);
        setOrganizerDetailError(
          getApiErrorMessage(error, t('adminOrganizerApplicationsDetailLoadFailed')),
        );
      } finally {
        setOrganizerDetailLoading(false);
      }
    },
    [isAdmin, router, t],
  );

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setUsersLoading(true);
    setUsersError(null);

    try {
      const nextUsers = await listAdminUsers();
      setUsers(nextUsers);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await clearAuthState();
        router.replace('/');
        return;
      }

      setUsers([]);
      setUsersError(getApiErrorMessage(error, t('adminUsersLoadFailed')));
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin, router, t]);

  const loadBackoffice = useCallback(async () => {
    await Promise.all([loadClaims(), loadOrganizers(), loadUsers()]);
  }, [loadClaims, loadOrganizers, loadUsers]);

  useEffect(() => {
    void loadBackoffice();
  }, [loadBackoffice]);

  const pendingOrganizers = useMemo(
    () =>
      organizers.filter(
        (item) => (item.organizer?.status || 'PENDING').toUpperCase() === 'PENDING',
      ),
    [organizers],
  );

  useEffect(() => {
    if (activeSection !== 'organizers') {
      return;
    }

    if (pendingOrganizers.length === 0) {
      setSelectedOrganizerId(null);
      setSelectedOrganizerDetail(null);
      setOrganizerDetailError(null);
      return;
    }

    if (
      !selectedOrganizerId ||
      !pendingOrganizers.some((item) => item.id === selectedOrganizerId)
    ) {
      setSelectedOrganizerId(pendingOrganizers[0].id);
    }
  }, [activeSection, pendingOrganizers, selectedOrganizerId]);

  useEffect(() => {
    if (activeSection !== 'organizers' || !selectedOrganizerId) {
      return;
    }

    void loadOrganizerDetail(selectedOrganizerId);
  }, [activeSection, loadOrganizerDetail, selectedOrganizerId]);

  const handleOpenDocument = async (documentUrl: string) => {
    try {
      await Linking.openURL(documentUrl);
    } catch {
      Alert.alert(t('commonErrorTitle'), t('adminPlaceClaimsDocumentOpenFailed'));
    }
  };

  const handleUpdateClaim = async (
    claimId: string,
    status: 'APPROVED' | 'REJECTED',
  ) => {
    if (actionClaimId) {
      return;
    }

    setActionClaimId(claimId);
    try {
      await updatePlaceClaimStatus(claimId, status);
      await loadClaims();
      Alert.alert(
        t('outingCreateSuccessTitle'),
        status === 'APPROVED'
          ? t('adminPlaceClaimsApprovedMessage')
          : t('adminPlaceClaimsRejectedMessage'),
      );
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('adminPlaceClaimsUpdateFailed')),
      );
    } finally {
      setActionClaimId(null);
    }
  };

  const handleUpdateOrganizerStatus = async (
    organizerId: string,
    status: AdminOrganizerStatus,
  ) => {
    if (actionOrganizerId) {
      return;
    }

    setActionOrganizerId(organizerId);
    try {
      await updateAdminOrganizerStatus(organizerId, status);
      await Promise.all([loadOrganizers(), loadOrganizerDetail(organizerId)]);
      Alert.alert(
        t('outingCreateSuccessTitle'),
        status === 'APPROVED'
          ? t('adminOrganizerApplicationsApprovedMessage')
          : status === 'REJECTED'
            ? t('adminOrganizerApplicationsRejectedMessage')
            : t('adminOrganizerApplicationsSuspendedMessage'),
      );
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('adminOrganizerApplicationsUpdateFailed')),
      );
    } finally {
      setActionOrganizerId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (deletingUserId) {
      return;
    }

    Alert.alert(
      t('adminUsersDeleteConfirmTitle'),
      t('adminUsersDeleteConfirmMessage'),
      [
        { text: t('genericCancel'), style: 'cancel' },
        {
          text: t('adminUsersDeleteConfirmCta'),
          style: 'destructive',
          onPress: async () => {
            setDeletingUserId(userId);
            try {
              await deleteAdminUser(userId);
              await loadUsers();
              Alert.alert(
                t('adminUsersDeleteSuccessTitle'),
                t('adminUsersDeleteSuccessMessage'),
              );
            } catch (error) {
              Alert.alert(
                t('commonErrorTitle'),
                getApiErrorMessage(error, t('adminUsersDeleteFailed')),
              );
            } finally {
              setDeletingUserId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (error && !user) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('organizerDataLoadErrorTitle')}
        description={t('organizerDataLoadErrorMessage')}
        actionLabel={t('organizerDataRetry')}
        onAction={() => {
          void refetch();
        }}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (!isAdmin) {
    return (
      <ScreenState
        mode="warning"
        fullScreen
        title={t('adminPlaceClaimsAccessTitle')}
        description={t('adminPlaceClaimsAccessDescription')}
        actionLabel={t('publicProfileBack')}
        onAction={() => router.back()}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 88 }}
    >
      <ScreenHeader
        title={t('adminBackofficeTitle')}
        subtitle={t('adminBackofficeSubtitle')}
        label={t('adminBackofficeLabel')}
        onBack={() => router.back()}
      />

      <View className="mt-5 flex-row rounded-full bg-gray-100 p-1 dark:bg-gray-900">
        <TouchableOpacity
          onPress={() => setActiveSection('claims')}
          className={`flex-1 rounded-full px-4 py-2.5 ${activeSection === 'claims' ? 'bg-[#4c669f]' : 'bg-transparent'}`}
        >
          <View className="items-center justify-center gap-1">
            <Ionicons
              name="clipboard-outline"
              size={14}
              color={activeSection === 'claims' ? '#fff' : '#374151'}
            />
            <Text
              className={`text-center text-[10px] font-semibold leading-4 ${
                activeSection === 'claims'
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              numberOfLines={1}
            >
              {t('adminBackofficeTabClaims')}
            </Text>
            <Text
              className={`text-center text-[10px] font-semibold leading-4 ${
                activeSection === 'claims'
                  ? 'text-white/80'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              ({claims.length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSection('organizers')}
          className={`flex-1 rounded-full px-4 py-2.5 ${activeSection === 'organizers' ? 'bg-[#4c669f]' : 'bg-transparent'}`}
        >
          <View className="items-center justify-center gap-1">
            <Ionicons
              name="briefcase-outline"
              size={14}
              color={activeSection === 'organizers' ? '#fff' : '#374151'}
            />
            <Text
              className={`text-center text-[10px] font-semibold leading-4 ${
                activeSection === 'organizers'
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              numberOfLines={1}
            >
              {t('adminBackofficeTabOrganizers')}
            </Text>
            <Text
              className={`text-center text-[10px] font-semibold leading-4 ${
                activeSection === 'organizers'
                  ? 'text-white/80'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              ({pendingOrganizers.length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSection('analytics')}
          className={`flex-1 rounded-full px-4 py-2.5 ${activeSection === 'analytics' ? 'bg-[#4c669f]' : 'bg-transparent'}`}
        >
          <View className="items-center justify-center gap-1">
            <Ionicons
              name="analytics-outline"
              size={14}
              color={activeSection === 'analytics' ? '#fff' : '#374151'}
            />
            <Text
              className={`text-center text-[10px] font-semibold leading-4 ${
                activeSection === 'analytics'
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              numberOfLines={1}
            >
              {t('adminBackofficeTabAnalytics')}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSection('users')}
          className={`flex-1 rounded-full px-4 py-2.5 ${activeSection === 'users' ? 'bg-[#4c669f]' : 'bg-transparent'}`}
        >
          <View className="items-center justify-center gap-1">
            <Ionicons
              name="people-outline"
              size={14}
              color={activeSection === 'users' ? '#fff' : '#374151'}
            />
            <Text
              className={`text-center text-[10px] font-semibold leading-4 ${
                activeSection === 'users'
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              numberOfLines={1}
            >
              {t('adminBackofficeTabUsers')}
            </Text>
            <Text
              className={`text-center text-[10px] font-semibold leading-4 ${
                activeSection === 'users'
                  ? 'text-white/80'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              ({users.length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {activeSection === 'claims' ? (
        <>
          <View className="mt-5">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {t('adminPlaceClaimsTitle')}
            </Text>
            <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('adminPlaceClaimsSubtitle')}
            </Text>
          </View>

          {claimsError ? (
            <ScreenState
              mode="error"
              title={claimsError}
              actionLabel={t('organizerDataRetry')}
              onAction={() => {
                void loadClaims();
              }}
              containerClassName="px-0 pt-4"
            />
          ) : claimsLoading ? (
            <ScreenState
              mode="loading"
              title={t('adminPlaceClaimsLoading')}
              containerClassName="px-0 pt-4"
            />
          ) : claims.length > 0 ? (
            <View className="mt-5">
              {claims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  onApprove={(claimId) => {
                    void handleUpdateClaim(claimId, 'APPROVED');
                  }}
                  onReject={(claimId) => {
                    void handleUpdateClaim(claimId, 'REJECTED');
                  }}
                  onOpenDocument={handleOpenDocument}
                  t={t}
                  approving={actionClaimId === claim.id}
                  rejecting={actionClaimId === claim.id}
                />
              ))}
            </View>
          ) : (
            <ScreenState
              mode="empty"
              icon="checkmark-done-outline"
              title={t('adminPlaceClaimsEmptyTitle')}
              description={t('adminPlaceClaimsEmptyDescription')}
              containerClassName="px-0 pt-4"
            />
          )}
        </>
      ) : activeSection === 'organizers' ? (
        <>
          <View className="mt-5">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {t('adminOrganizerApplicationsTitle')}
            </Text>
            <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('adminOrganizerApplicationsSubtitle')}
            </Text>
          </View>

          {organizersError ? (
            <ScreenState
              mode="error"
              title={organizersError}
              actionLabel={t('organizerDataRetry')}
              onAction={() => {
                void loadOrganizers();
              }}
              containerClassName="px-0 pt-4"
            />
          ) : organizersLoading ? (
            <ScreenState
              mode="loading"
              title={t('adminOrganizerApplicationsLoading')}
              containerClassName="px-0 pt-4"
            />
          ) : pendingOrganizers.length > 0 ? (
            <View className="mt-5">
              {pendingOrganizers.map((organizer) => (
                <OrganizerSummaryCard
                  key={organizer.id}
                  organizer={organizer}
                  onPress={(id) => setSelectedOrganizerId(id)}
                  t={t}
                  locale={locale}
                />
              ))}

              {organizerDetailLoading ? (
                <ScreenState
                  mode="loading"
                  title={t('adminOrganizerApplicationsDetailsLoading')}
                  containerClassName="px-0 pt-2"
                />
              ) : organizerDetailError ? (
                <ScreenState
                  mode="error"
                  title={organizerDetailError}
                  actionLabel={t('organizerDataRetry')}
                  onAction={() => {
                    if (selectedOrganizerId) {
                      void loadOrganizerDetail(selectedOrganizerId);
                    }
                  }}
                  containerClassName="px-0 pt-2"
                />
              ) : selectedOrganizerDetail ? (
                <OrganizerDetailCard
                  organizer={selectedOrganizerDetail}
                  locale={locale}
                  t={t}
                  revealed={revealSensitive}
                  onToggleReveal={() => setRevealSensitive((current) => !current)}
                  onApprove={(organizerId) => {
                    void handleUpdateOrganizerStatus(organizerId, 'APPROVED');
                  }}
                  onReject={(organizerId) => {
                    void handleUpdateOrganizerStatus(organizerId, 'REJECTED');
                  }}
                  onSuspend={(organizerId) => {
                    void handleUpdateOrganizerStatus(organizerId, 'SUSPENDED');
                  }}
                  busy={actionOrganizerId === selectedOrganizerDetail.id}
                  onOpenPlace={(placeId) => {
                    router.push({
                      pathname: '/place/[id]',
                      params: { id: placeId },
                    });
                  }}
                />
              ) : (
                <ScreenState
                  mode="empty"
                  title={t('adminOrganizerApplicationsNoSelectionTitle')}
                  description={t('adminOrganizerApplicationsNoSelectionDescription')}
                  containerClassName="px-0 pt-2"
                />
              )}
            </View>
          ) : (
            <ScreenState
              mode="empty"
              icon="people-outline"
              title={t('adminOrganizerApplicationsEmptyTitle')}
              description={t('adminOrganizerApplicationsEmptyDescription')}
              containerClassName="px-0 pt-4"
            />
          )}
        </>
      ) : activeSection === 'analytics' ? (
        <AdminAnalyticsPanel />
      ) : (
        <>
          <View className="mt-5">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {t('adminUsersTitle')}
            </Text>
            <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('adminUsersSubtitle')}
            </Text>
          </View>

          {usersError ? (
            <ScreenState
              mode="error"
              title={usersError}
              actionLabel={t('organizerDataRetry')}
              onAction={() => {
                void loadUsers();
              }}
              containerClassName="px-0 pt-4"
            />
          ) : usersLoading ? (
            <ScreenState
              mode="loading"
              title={t('adminUsersLoading')}
              containerClassName="px-0 pt-4"
            />
          ) : users.length > 0 ? (
            <View className="mt-5">
              {users.map((item) => (
                <AdminUserCard
                  key={item.id}
                  user={item}
                  onDelete={(id) => {
                    void handleDeleteUser(id);
                  }}
                  deleting={deletingUserId === item.id}
                  t={t}
                />
              ))}
            </View>
          ) : (
            <ScreenState
              mode="empty"
              icon="people-outline"
              title={t('adminUsersEmptyTitle')}
              description={t('adminUsersEmptyDescription')}
              containerClassName="px-0 pt-4"
            />
          )}
        </>
      )}
    </ScrollView>
  );
}
