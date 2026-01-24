import { View, Text } from 'react-native';

export default function CreateScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <Text className="text-xl font-bold text-gray-800">Ajouter ➕</Text>
      <Text className="text-gray-500 mt-2">Publier un événement ou un lieu</Text>
    </View>
  );
}