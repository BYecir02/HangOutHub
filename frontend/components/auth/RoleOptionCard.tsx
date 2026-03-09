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
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.86}
      className={`mb-4 rounded-[30px] border p-5 ${
        selected
          ? isDark
            ? 'border-white/30 bg-white/10'
            : 'border-slate-900/10 bg-white'
          : isDark
            ? 'border-white/10 bg-white/5'
            : 'border-slate-200 bg-white/80'
      }`}
    >
      <View className="flex-row items-center">
        <View
          className="mr-4 h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <Ionicons name={icon} size={24} color={accentColor} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}
            >
              {title}
            </Text>
            {selected ? (
              <View
                className="h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: accentColor }}
              >
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              </View>
            ) : null}
          </View>
          <Text
            className={`mt-1 text-sm leading-5 ${
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
