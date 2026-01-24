import { View, Text } from 'react-native';
import Header from '../../components/ui/Header';

export default function DiscoverScreen() {
  return (
    <View className="flex-1 bg-gray-50">
      <Header 
        onNotificationPress={() => console.log("Notifications cliquées")}
      />
      <View className="flex-1 justify-center items-center">
        <Text className="text-xl font-bold text-gray-800">Découvrir 🔍</Text>
        <Text className="text-gray-500 mt-2">Recherche et filtres bientôt ici</Text>
      </View>
    </View>
  );
}