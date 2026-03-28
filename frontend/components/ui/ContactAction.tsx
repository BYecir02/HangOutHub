import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ContactActionProps = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  className?: string;
};

export default function ContactAction({
  label,
  onPress,
  icon = 'chatbubble-ellipses-outline',
  color = '#4c669f',
  className = '',
}: ContactActionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mt-2 self-start rounded-full px-3 py-1.5 ${className}`.trim()}
      style={{ backgroundColor: color }}
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={14} color="#fff" />
        <Text className="ml-2 text-xs font-semibold text-white">{label}</Text>
      </View>
    </TouchableOpacity>
  );
}
