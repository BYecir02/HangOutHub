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

import { storage } from '../services/api';

type ActionItem = {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  path: string;
};

interface StoredUser {
  role?: string;
  hasPlace?: boolean;
}

function getActionsForUser(user: StoredUser | null): ActionItem[] {
  const role = user?.role || 'USER';

  if (role === 'ORGANIZER') {
    return [
      {
        label: 'Evenement',
        description: 'Publier une date et son ambiance',
        icon: 'calendar-outline',
        color: '#ff4757',
        path: '/event',
      },
      {
        label: 'Post',
        description: 'Annoncer une info ou une vibe',
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
          label: 'Mon lieu',
          description: 'Creer la base de ton espace',
          icon: 'location-outline',
          color: '#2ecc71',
          path: '/place',
        },
        {
          label: 'Post',
          description: 'Partager une actualite rapide',
          icon: 'create-outline',
          color: '#f39c12',
          path: '/post',
        },
      ];
    }

    return [
      {
        label: 'Evenement',
        description: 'Programmer une date dans ton lieu',
        icon: 'calendar-outline',
        color: '#ff4757',
        path: '/event',
      },
      {
        label: 'Ajouter un lieu',
        description: 'Publier une nouvelle adresse',
        icon: 'location-outline',
        color: '#2ecc71',
        path: '/place',
      },
      {
        label: 'Post',
        description: 'Faire vivre ton activite',
        icon: 'create-outline',
        color: '#f39c12',
        path: '/post',
      },
    ];
  }

  return [
    {
      label: 'Sortie',
      description: 'Planifier un rendez-vous entre amis',
      icon: 'people-outline',
      color: '#4c669f',
      path: '/outing',
    },
    {
      label: 'Post',
      description: 'Publier une photo ou une idee',
      icon: 'create-outline',
      color: '#f39c12',
      path: '/post',
    },
  ];
}

export default function CreateModalScreen() {
  const router = useRouter();
  const translateY = useSharedValue(0);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const hydrateUser = async () => {
        const raw = await storage.getItem('userInfo');
        if (!raw || !isMounted) {
          setCurrentUser(null);
          return;
        }

        setCurrentUser(JSON.parse(raw) as StoredUser);
      };

      void hydrateUser();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const actions = getActionsForUser(currentUser);

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
            Que veux-tu creer ?
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-gray-500 dark:text-gray-400">
            Les raccourcis changent selon ton profil pour garder un parcours propre.
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
              Annuler
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
