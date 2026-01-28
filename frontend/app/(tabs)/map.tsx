import { View, Text } from 'react-native';

export default function MapScreen() {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <View className="flex-1 justify-center items-center">
        <Text className="text-xl font-bold text-gray-800 dark:text-white">Carte 🗺️</Text>
        <Text className="text-gray-500 dark:text-gray-400 mt-2">La carte interactive sera ici</Text>
      </View>
    </View>
  );
}