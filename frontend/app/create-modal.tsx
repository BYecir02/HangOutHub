import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useI18n } from '@/hooks/use-i18n';
import type { TranslationKey } from '@/services/i18n';
import {
  resolveStoredUserSession,
  type StoredUserSession,
} from '@/services/user-session';

type ActionItem = {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  path: string;
};

function getActionsForUser(
  user: StoredUserSession | null,
  t: (key: TranslationKey) => string,
): ActionItem[] {
  const role = user?.role || 'USER';

  if (role === 'ORGANIZER') {
    return [
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
      },
    ];
  }

  if (role === 'PLACE_OWNER') {
    if (!user?.hasPlace) {
      return [
        {
          label: t('createActionMyPlaceLabel'),
          description: t('createActionMyPlaceDesc'),
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
        },
      ];
    }

    return [
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
    },
    {
      label: t('createActionPostLabel'),
      description: t('createActionPostIdeaDesc'),
      icon: 'create-outline',
      color: '#f39c12',
      path: '/post',
    },
  ];
}

export default function CreateModalScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const translateY = useSharedValue(0);
  const [currentUser, setCurrentUser] = useState<StoredUserSession | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const hydrateUser = async () => {
        const resolvedUser = await resolveStoredUserSession();

        if (!isMounted) {
          return;
        }

        if (!resolvedUser) {
          setCurrentUser(null);
          return;
        }

        setCurrentUser(resolvedUser);
      };

      void hydrateUser();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const actions = getActionsForUser(currentUser, t);

  const handleClose = () => router.back();

  const gesture = Gesture.Pan()
    .onChange((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd(() => {
      if (translateY.value > 100) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const navigateTo = (path: string) => {
    translateY.value = withTiming(1000, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(router.replace)(path as never);
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View className="flex-1 justify-end">
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          entering={SlideInDown}
          exiting={SlideOutDown}
          style={animatedStyle}
          className="rounded-t-3xl bg-white p-6 pb-10 shadow-2xl dark:bg-gray-900"
        >
          <View className="mb-6 items-center">
            <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
          </View>

          <Text className="text-center text-xl font-bold text-gray-800 dark:text-white">
            {t('createModalTitle')}
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-gray-500 dark:text-gray-400">
            {t('createModalSubtitle')}
          </Text>

          <View className="mt-6">
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => navigateTo(action.path)}
                className="mb-4 flex-row items-center rounded-3xl bg-gray-50 p-4 dark:bg-gray-800"
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

          <TouchableOpacity onPress={handleClose} className="mt-4 items-center">
            <Text className="font-medium text-gray-400 dark:text-gray-500">
              {t('createModalCancel')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
