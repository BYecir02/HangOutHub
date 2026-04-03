import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InspirationCardProps {
  title: string;
  subtitle?: string;
  imageUrl: string;
  accentColor: string;
  badgeLabel: string;
  metaLabel: string;
  metaIcon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  imageHeight?: number;
  cardWidthClassName?: string;
}

export default function InspirationCard({
  title,
  subtitle,
  imageUrl,
  accentColor,
  badgeLabel,
  metaLabel,
  metaIcon,
  onPress,
  imageHeight = 178,
  cardWidthClassName = 'w-72',
}: InspirationCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mr-4 overflow-hidden rounded-[30px] border bg-white shadow-sm dark:bg-gray-900 ${cardWidthClassName}`.trim()}
      activeOpacity={0.92}
      style={{ borderColor: `${accentColor}30`, borderWidth: 1.5 }}
    >
      <View className="relative">
        <Image
          source={{ uri: imageUrl }}
          className="w-full bg-gray-200 dark:bg-gray-800"
          style={{ height: imageHeight }}
          resizeMode="cover"
        />

        <View
          className="absolute left-3 top-3 rounded-full px-3 py-1.5"
          style={{ backgroundColor: `${accentColor}CC` }}
        >
          <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
            {badgeLabel}
          </Text>
        </View>

        <View className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5">
          <View className="flex-row items-center">
            <Ionicons name={metaIcon} size={10} color="#ffffff" />
            <Text className="ml-1 text-[10px] font-semibold text-white">
              {metaLabel}
            </Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
