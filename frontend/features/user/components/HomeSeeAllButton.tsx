import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HomeSeeAllButtonProps {
  label: string;
  onPress: () => void;
  /**
   * 'onImage' : variante posée sur un visuel sombre (header Netflix), avec un
   * fond translucide clair pour rester lisible. 'default' : pastille rouge claire.
   */
  variant?: 'default' | 'onImage';
}

export default function HomeSeeAllButton({
  label,
  onPress,
  variant = 'default',
}: HomeSeeAllButtonProps) {
  const onImage = variant === 'onImage';

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`flex-row items-center rounded-full px-3 py-1.5 ${
        onImage ? 'bg-white/20' : 'bg-[#ff4757]/10'
      }`}
    >
      <Text className="text-xs font-semibold text-[#ff4757]">{label}</Text>
      <Ionicons
        name="chevron-forward"
        size={13}
        color="#ff4757"
        style={{ marginLeft: 2 }}
      />
    </TouchableOpacity>
  );
}
