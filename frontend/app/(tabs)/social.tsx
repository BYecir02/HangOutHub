import { View, Text } from 'react-native';

export default function SocialScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <Text className="text-xl font-bold text-gray-800">Social 👥</Text>
      <Text className="text-gray-500 mt-2">Groupes, amis et chats</Text>
    </View>
  );
}