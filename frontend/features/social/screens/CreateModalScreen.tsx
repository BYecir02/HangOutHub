import React, { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import BottomSheetModal from '@/shared/ui/BottomSheetModal';
import { useI18n } from '@/shared/hooks/use-i18n';
import type { TranslationKey } from '@/services/shared/i18n';
import {
  resolveStoredUserSession,
  type StoredUserSession,
} from '@/services/auth/user-session';

type ActionItem = {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  path: string;
  params?: Record<string, string>;
};

type CreateContext = {
  placeId?: string;
  placeName?: string;
  cityName?: string;
  sourceLabel?: string;
  outingTitle?: string;
  eventId?: string;
  eventTitle?: string;
};

function getActionsForUser(
  user: StoredUserSession | null,
  t: (key: TranslationKey) => string,
  context?: CreateContext,
): ActionItem[] {
  const postParams: Record<string, string> = {};
  const outingParams: Record<string, string> = {};

  if (context?.placeId) {
    postParams.placeId = context.placeId;
    outingParams.placeId = context.placeId;
  }
  if (context?.placeName) {
    postParams.placeName = context.placeName;
  }
  if (context?.cityName) {
    postParams.cityName = context.cityName;
  }
  if (context?.eventId) {
    postParams.eventId = context.eventId;
    outingParams.eventId = context.eventId;
  }
  if (context?.eventTitle) {
    postParams.eventTitle = context.eventTitle;
  }
  if (context?.sourceLabel) {
    outingParams.sourceLabel = context.sourceLabel;
  }
  if (context?.outingTitle) {
    outingParams.title = context.outingTitle;
  }

  const role = user?.role || 'USER';

  if (role === 'ORGANIZER') {
    return [
      {
        label: t('createActionOutingLabel'),
        description: t('createActionOutingDesc'),
        icon: 'people-outline',
        color: '#4c669f',
        path: '/outing',
        params: Object.keys(outingParams).length ? outingParams : undefined,
      },
      {
        label: t('createActionEventLabel'),
        description: t('createActionEventPublishDesc'),
        icon: 'calendar-outline',
        color: '#ff4757',
        path: '/event',
      },
      {
        label: t('createActionPostLabel'),
        description: t('createActionPostAnnounceDesc'),
        icon: 'create-outline',
        color: '#f39c12',
        path: '/post',
        params: Object.keys(postParams).length ? postParams : undefined,
      },
    ];
  }

  if (role === 'PLACE_OWNER') {
    if (!user?.hasPlace) {
      return [
        {
          label: t('createActionOutingLabel'),
          description: t('createActionOutingDesc'),
          icon: 'people-outline',
          color: '#4c669f',
          path: '/outing',
          params: Object.keys(outingParams).length ? outingParams : undefined,
        },
        {
          label: t('createActionAddPlaceLabel'),
          description: t('createActionAddPlaceDesc'),
          icon: 'location-outline',
          color: '#2ecc71',
          path: '/organizer/create-place',
        },
        {
          label: t('createActionPostLabel'),
          description: t('createActionPostQuickDesc'),
          icon: 'create-outline',
          color: '#f39c12',
          path: '/post',
          params: Object.keys(postParams).length ? postParams : undefined,
        },
      ];
    }

    return [
      {
        label: t('createActionOutingLabel'),
        description: t('createActionOutingDesc'),
        icon: 'people-outline',
        color: '#4c669f',
        path: '/outing',
        params: Object.keys(outingParams).length ? outingParams : undefined,
      },
      {
        label: t('createActionEventLabel'),
        description: t('createActionEventInPlaceDesc'),
        icon: 'calendar-outline',
        color: '#ff4757',
        path: '/event',
      },
      {
        label: t('createActionAddPlaceLabel'),
        description: t('createActionAddPlaceDesc'),
        icon: 'location-outline',
        color: '#2ecc71',
        path: '/organizer/create-place',
      },
      {
        label: t('createActionPostLabel'),
        description: t('createActionPostActivityDesc'),
        icon: 'create-outline',
        color: '#f39c12',
        path: '/post',
        params: Object.keys(postParams).length ? postParams : undefined,
      },
    ];
  }

  return [
    {
      label: t('createActionOutingLabel'),
      description: t('createActionOutingDesc'),
      icon: 'people-outline',
      color: '#4c669f',
      path: '/outing',
      params: Object.keys(outingParams).length ? outingParams : undefined,
    },
    {
      label: t('createActionPostLabel'),
      description: t('createActionPostIdeaDesc'),
      icon: 'create-outline',
      color: '#f39c12',
      path: '/post',
      params: Object.keys(postParams).length ? postParams : undefined,
    },
  ];
}

export default function CreateModalScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    placeId?: string;
    placeName?: string;
    cityName?: string;
    sourceLabel?: string;
    outingTitle?: string;
    eventId?: string;
    eventTitle?: string;
  }>();
  const [currentUser, setCurrentUser] = useState<StoredUserSession | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const hydrateUser = async () => {
        try {
          const resolvedUser = await resolveStoredUserSession();
          if (!isMounted) {
            return;
          }

          if (!resolvedUser) {
            router.replace('/');
            return;
          }

          setCurrentUser(resolvedUser || null);
        } catch {
          if (!isMounted) {
            return;
          }
          setCurrentUser(null);
        }
      };

      void hydrateUser();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const actions = useMemo(
    () =>
      getActionsForUser(currentUser, t, {
        placeId: typeof params.placeId === 'string' ? params.placeId : undefined,
        placeName: typeof params.placeName === 'string' ? params.placeName : undefined,
        cityName: typeof params.cityName === 'string' ? params.cityName : undefined,
        sourceLabel: typeof params.sourceLabel === 'string' ? params.sourceLabel : undefined,
        outingTitle: typeof params.outingTitle === 'string' ? params.outingTitle : undefined,
        eventId: typeof params.eventId === 'string' ? params.eventId : undefined,
        eventTitle: typeof params.eventTitle === 'string' ? params.eventTitle : undefined,
      })
        // Bouton "Publication" masqué temporairement (réseau social en veille).
        // Pour le réactiver : supprimer ce .filter().
        .filter((action) => action.path !== '/post'),
    [
      currentUser,
      params.cityName,
      params.eventId,
      params.eventTitle,
      params.outingTitle,
      params.placeId,
      params.placeName,
      params.sourceLabel,
      t,
    ],
  );

  const handleClose = () => router.back();

  const navigateTo = (path: string, pathParams?: Record<string, string>) => {
    router.replace({
      pathname: path as never,
      params: pathParams,
    });
  };

  return (
    <BottomSheetModal
      visible
      onClose={handleClose}
      title={t('createModalTitle')}
      subtitle={t('createModalSubtitle')}
      maxHeight={680}
      contentMode="auto"
      footer={
        <TouchableOpacity
          onPress={handleClose}
          className="items-center rounded-2xl border border-gray-200 py-3 dark:border-gray-700"
        >
          <Text className="font-semibold text-gray-600 dark:text-gray-300">
            {t('createModalCancel')}
          </Text>
        </TouchableOpacity>
      }
    >
      {actions.length > 0 ? (
        <View>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => navigateTo(action.path, action.params)}
                className="mb-3 flex-row items-center rounded-3xl bg-gray-50 p-4 dark:bg-gray-800"
                style={{
                  borderWidth: 1,
                  borderColor: `${action.color}2A`,
                }}
              >
                <View
                  className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${action.color}18` }}
                >
                  <Ionicons name={action.icon} size={26} color={action.color} />
                </View>

                <View className="flex-1 pr-3">
                  <Text className="text-base font-bold text-gray-800 dark:text-white">
                    {action.label}
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                    {action.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
        </View>
      ) : (
        <View className="py-8">
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
            Aucune action disponible pour le moment.
          </Text>
        </View>
      )}
    </BottomSheetModal>
  );
}
