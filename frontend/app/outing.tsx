import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CreateOutingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1 bg-white dark:bg-black pt-14">
      <View className="flex-row items-center px-5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-full">
          <Ionicons name="close" size={24} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800 dark:text-white flex-1">Créer une Sortie </Text>
      </View>
    </View>
  );
}