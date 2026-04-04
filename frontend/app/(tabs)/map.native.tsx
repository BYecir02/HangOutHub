import Constants from 'expo-constants';
import type { ComponentType } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function MapTabRoute() {
  const router = useRouter();
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  if (isExpoGo) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-black">
        <Text className="text-center text-2xl font-bold text-gray-900 dark:text-white">
          MapLibre needs a dev build
        </Text>
        <Text className="mt-3 text-center text-sm text-gray-600 dark:text-gray-300">
          This map screen uses native MapLibre modules, so it will not run inside Expo Go.
          Open a development build or the Android preview build to use the map.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/home')}
          className="mt-6 rounded-full bg-[#4c669f] px-5 py-3"
        >
          <Text className="text-sm font-semibold text-white">Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const MapScreen = require('@/components/screens/MapScreen.native').default as ComponentType;
  return <MapScreen />;
}
