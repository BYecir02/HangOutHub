import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    router.replace('/');
  };

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 p-5">
      <Ionicons name="beer-outline" size={80} color="#4c669f" />

      <Text className="text-3xl font-bold text-gray-800 mt-5 text-center">
        Bienvenue au Hub ! 🇧🇯
      </Text>

      <Text className="text-lg text-gray-500 mt-2 mb-8">
        Mode NativeWind Activé ✅
      </Text>
      
      <View className="bg-white p-5 rounded-2xl mb-10 shadow-sm w-full max-w-sm">
        <Text className="text-center text-gray-600 leading-6 text-base">
          Nativewind réussi
        </Text>
      </View>

      <TouchableOpacity 
        className="bg-[#ff4757] py-3 px-8 rounded-full shadow-lg" 
        onPress={handleLogout}
      >
        <Text className="text-white font-bold text-base">
          Se déconnecter
        </Text>
      </TouchableOpacity>
    </View>
  );
}