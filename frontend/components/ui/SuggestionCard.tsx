import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SuggestionCardProps {
  title: string;
  category: string;
  image: string;
  reason: string; // Ex: "Similaire à tes sorties"
  date: string;
  onPress: () => void;
}

export default function SuggestionCard({ title, category, image, reason, date, onPress }: SuggestionCardProps) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-white dark:bg-gray-900 p-3 rounded-2xl mb-4 flex-row border border-gray-100 dark:border-gray-800 shadow-sm"
    >
      {/* Image carrée à gauche */}
      <Image 
        source={{ uri: image }} 
        className="w-24 h-24 rounded-xl bg-gray-200 dark:bg-gray-800"
        resizeMode="cover"
      />

      {/* Contenu à droite */}
      <View className="flex-1 ml-4 justify-between py-1">
        <View>
          {/* Badge de la raison (Algo) */}
          <View className="flex-row items-center mb-1">
            <Ionicons name="sparkles" size={12} color="#f59e0b" />
            <Text className="text-[#f59e0b] text-[10px] font-bold ml-1 uppercase">
              {reason}
            </Text>
          </View>

          <Text className="text-gray-800 dark:text-white font-bold text-base leading-5" numberOfLines={2}>
            {title}
          </Text>
          <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1">{category}</Text>
        </View>

        {/* Date et Flèche */}
        <View className="flex-row justify-between items-center mt-2">
          <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">
            <Ionicons name="time-outline" size={12} color="#666" />
            <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">{date}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}