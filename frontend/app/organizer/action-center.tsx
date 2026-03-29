import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import { canAccessOrganizerCapability } from '@/services/organizer-access';

interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  path: string;
}

function ActionCard({
  item,
  onPress,
}: {
  item: ActionItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-3xl bg-white p-4 dark:bg-gray-900"
      style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
    >
      <View
        className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: item.bgColor }}
      >
        <Ionicons name={item.icon} size={24} color={item.iconColor} />
      </View>
      <View className="flex-1 pr-3">
        <Text className="text-base font-bold text-gray-800 dark:text-white">
          {item.title}
        </Text>
        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {item.subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}

export default function OrganizerActionCenterScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading, error, refetch } = useUserProfile();
  const isAllowed = useOrganizerGuard({
    user,
    loading,
    suspend: Boolean(error),
    requiredCapability: 'actionCenter',
  });

  const actions = useMemo(() => {
    if (!user) {
      return [] as ActionItem[];
    }

    const items: ActionItem[] = [];

    if (canAccessOrganizerCapability(user, 'events')) {
      items.push({
        id: 'manage-events',
        title: t('organizerActionCenterManageEvents'),
        subtitle: t('organizerActionCenterManageEventsHint'),
        icon: 'calendar-outline',
        iconColor: '#4c669f',
        bgColor: '#4c669f18',
        path: '/organizer/events',
      });
    }

    if (canAccessOrganizerCapability(user, 'places')) {
      items.push({
        id: 'manage-places',
        title: t('organizerActionCenterManagePlaces'),
        subtitle: t('organizerActionCenterManagePlacesHint'),
        icon: 'business-outline',
        iconColor: '#2ecc71',
        bgColor: '#2ecc7118',
        path: '/organizer/places',
      });
      items.push({
        id: 'create-place',
        title: t('organizerActionCenterCreatePlace'),
        subtitle: t('organizerActionCenterCreatePlaceHint'),
        icon: 'add-circle-outline',
        iconColor: '#2e9f62',
        bgColor: '#2ecc7118',
        path: '/organizer/create-place',
      });
    }

    if (
      user.role === 'ORGANIZER' ||
      user.role === 'PLACE_OWNER' ||
      user.role === 'ADMIN'
    ) {
      items.push({
        id: 'create-event',
        title: t('organizerActionCenterCreateEvent'),
        subtitle: t('organizerActionCenterCreateEventHint'),
        icon: 'flash-outline',
        iconColor: '#ff4757',
        bgColor: '#ff475718',
        path: '/event',
      });
    }

    if (canAccessOrganizerCapability(user, 'scanner')) {
      items.push({
        id: 'scanner',
        title: t('organizerActionCenterScanner'),
        subtitle: t('organizerActionCenterScannerHint'),
        icon: 'scan-outline',
        iconColor: '#ff9f1a',
        bgColor: '#ff9f1a18',
        path: '/organizer/scanner',
      });
    }

    return items;
  }, [t, user]);

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

  if (!user || !isAllowed) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
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
        title={t('organizerActionCenterTitle')}
        subtitle={t('organizerActionCenterSubtitle')}
        label={t('organizerActionCenterLabel')}
      />

      <View className="mt-5">
        {actions.map((item) => (
          <ActionCard
            key={item.id}
            item={item}
            onPress={() => router.push(item.path as never)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

