import { Link } from 'expo-router';
import { View, Text } from 'react-native';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black p-5">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Ceci est un modal</Text>
      <Link href="/" dismissTo className="mt-4 py-4">
        <Text className="text-[#4c669f] font-bold text-lg">Retour à l'accueil</Text>
      </Link>
    </View>
  );
}
