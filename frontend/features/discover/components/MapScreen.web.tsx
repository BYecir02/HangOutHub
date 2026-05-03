import React from 'react';
import { Text, View } from 'react-native';

export default function MapScreenWeb() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-center text-lg font-semibold text-gray-900">
        La carte n'est pas disponible sur le web.
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-600">
        Utilise l'application mobile pour voir les lieux et evenements sur la carte.
      </Text>
    </View>
  );
}
