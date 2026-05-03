import React from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import type { UserProfile } from '@/hooks/useUserProfile';

import { getImageUrl } from '../../../services/api';

interface ProfileHeaderProps {
  user: UserProfile | null;
  isOrganizer?: boolean;
  canAccessProPanel?: boolean;
  canActivateProPanel?: boolean;
  proPanelLabel?: string;
  onOpenProPanel?: () => void;
  onActivateProPanel?: () => void;
  onImagePress: (url: string) => void;
}

function getStatusColors(
  status: string | undefined,
  t: (key: 'profileStatusVerified' | 'profileStatusPending' | 'profileStatusInProgress') => string,
) {
  if (status === 'APPROVED') {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      label: t('profileStatusVerified'),
    };
  }

  if (status === 'PENDING') {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      label: t('profileStatusPending'),
    };
  }

  return {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-300',
    label: t('profileStatusInProgress'),
  };
}

export default function ProfileHeader({
  user,
  isOrganizer = false,
  canAccessProPanel = false,
  canActivateProPanel = false,
  proPanelLabel,
  onOpenProPanel,
  onActivateProPanel,
  onImagePress,
}: ProfileHeaderProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();
  const cacheBustKey = user?.updatedAt ? String(user.updatedAt) : '';
  const withCacheBust = (value: string | null | undefined, fallback: string) => {
    const resolved = getImageUrl(value) || fallback;

    if (!cacheBustKey || !resolved) {
      return resolved;
    }

    const separator = resolved.includes('?') ? '&' : '?';
    return `${resolved}${separator}v=${encodeURIComponent(cacheBustKey)}`;
  };

  const coverUrl = withCacheBust(
    user?.coverUrl,
    'https://images.unsplash.com/photo-1557683316-973673baf926',
  );
  const avatarUrl = withCacheBust(user?.avatarUrl, 'https://i.pravatar.cc/150');
  const statusConfig = getStatusColors(user?.OrganizerProfile?.status, t);
  const organizerPanelLabel =
    user?.role === 'PLACE_OWNER'
      ? t('profilePlaceOwnerPanel')
      : t('profileOrganizerPanel');

  return (
    <View>
      <View className="h-48 bg-gray-200 dark:bg-gray-800">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(coverUrl)}
          className="h-full w-full"
        >
          <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
        </TouchableOpacity>

        <View className="absolute -bottom-12 left-5">
          <View className="relative rounded-full bg-white p-1 shadow-sm dark:bg-black">
            <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(avatarUrl)}>
              <Image source={{ uri: avatarUrl }} className="h-24 w-24 rounded-full" resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-blue-500 p-1.5 dark:border-black">
              <Ionicons name="camera" size={14} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="mt-14 px-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {user?.displayName || user?.username || t('profileUserFallback')}
            </Text>
            <Text className="font-medium text-gray-500 dark:text-gray-400">
              @{user?.username || 'user'}
            </Text>
          </View>
          <TouchableOpacity
            className="rounded-full border border-gray-100 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
            onPress={() => router.push('/settings')}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={isDark ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        </View>

        {isOrganizer ? (
          <View className={`mt-3 self-start rounded-full px-3 py-2 ${statusConfig.bg}`}>
            <Text className={`text-xs font-semibold uppercase tracking-widest ${statusConfig.text}`}>
              {statusConfig.label}
            </Text>
          </View>
        ) : null}

        <Text className="mt-3 leading-5 text-gray-700 dark:text-gray-300">
          {user?.bio || t('profileNoBioYet')}
        </Text>

        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 items-center rounded-lg border border-gray-200 bg-gray-100 py-2.5 active:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700"
            onPress={() => router.push('/edit-profile')}
          >
            <Text className="text-sm font-bold text-gray-800 dark:text-white">
              {t('profileEditProfile')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 items-center rounded-lg border border-gray-200 bg-gray-100 py-2.5 active:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700"
            onPress={() => router.push('/my-tickets')}
          >
            <Text className="text-sm font-bold text-gray-800 dark:text-white">
              {t('myTicketsTitle')}
            </Text>
          </TouchableOpacity>

        </View>

        {canAccessProPanel ? (
          <TouchableOpacity
            className="mt-3 items-center rounded-lg border border-gray-200 bg-gray-100 py-2.5 active:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700"
            onPress={() => {
              if (onOpenProPanel) {
                onOpenProPanel();
                return;
              }
              router.push('/organizer/dashboard');
            }}
          >
            <Text className="text-sm font-bold text-gray-800 dark:text-white">
              {proPanelLabel || organizerPanelLabel}
            </Text>
          </TouchableOpacity>
        ) : null}

        {!canAccessProPanel && canActivateProPanel ? (
          <TouchableOpacity
            className="mt-3 items-center rounded-lg border border-[#4c669f]/35 bg-[#4c669f]/10 py-2.5 active:opacity-90 dark:border-[#4c669f]/50 dark:bg-[#4c669f]/20"
            onPress={() => {
              if (onActivateProPanel) {
                onActivateProPanel();
                return;
              }
              router.push('/activate-pro');
            }}
          >
            <Text className="text-sm font-bold text-[#4c669f]">
              {t('profileActivateProPanel')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
