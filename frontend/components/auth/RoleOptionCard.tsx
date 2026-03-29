import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

type RoleOptionCardProps = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  isDark: boolean;
  selected?: boolean;
  onPress: () => void;
};

export default function RoleOptionCard({
  title,
  description,
  icon,
  accentColor,
  isDark,
  selected = false,
  onPress,
}: RoleOptionCardProps) {
  const selectedSurface = isDark ? `${accentColor}22` : `${accentColor}14`;
  const selectedBorder = isDark ? `${accentColor}AA` : `${accentColor}99`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.86}
      className={`mb-3 rounded-[28px] border px-5 py-4 ${
        selected
          ? isDark
            ? 'bg-white/10'
            : 'bg-white'
          : isDark
            ? 'border-white/10 bg-white/5'
            : 'border-slate-200 bg-white/80'
      }`}
      style={
        selected
          ? {
              borderColor: selectedBorder,
              backgroundColor: selectedSurface,
            }
          : undefined
      }
    >
      <View className="flex-row items-center">
        <View
          className="mr-4 h-14 w-14 items-center justify-center rounded-[18px]"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <Ionicons name={icon} size={24} color={accentColor} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-[17px] font-semibold ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}
            >
              {title}
            </Text>
            <View
              className={`h-7 w-7 items-center justify-center rounded-full border ${
                selected
                  ? ''
                  : isDark
                    ? 'border-white/20 bg-transparent'
                    : 'border-slate-300 bg-transparent'
              }`}
              style={
                selected
                  ? { borderColor: accentColor, backgroundColor: accentColor }
                  : undefined
              }
            >
              {selected ? (
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              ) : (
                <Ionicons
                  name="ellipse-outline"
                  size={13}
                  color={isDark ? '#64748b' : '#94a3b8'}
                />
              )}
            </View>
          </View>
          <Text
            className={`mt-1.5 text-[13px] leading-5 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
