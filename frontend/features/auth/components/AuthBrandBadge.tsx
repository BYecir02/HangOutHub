import React from 'react';
import { Image, Text, View } from 'react-native';

type AuthBrandBadgeProps = {
  isDark: boolean;
  showName?: boolean;
};

const BRAND_MARK = require('../../../assets/images/hangouthub-logo-mark-512.png');

export default function AuthBrandBadge({
  isDark,
  showName = true,
}: AuthBrandBadgeProps) {
  return (
    <View
      className={`self-start flex-row items-center rounded-full border px-3 py-2 ${
        isDark
          ? 'border-white/20 bg-white/10'
          : 'border-slate-200 bg-white/95'
      }`}
    >
      <View className="h-7 w-7 overflow-hidden rounded-full">
        <Image
          source={BRAND_MARK}
          className="h-full w-full"
          resizeMode="contain"
        />
      </View>
      {showName ? (
        <Text
          className={`ml-2 text-xs tracking-[0.08em] ${
            isDark ? 'text-white' : 'text-slate-800'
          }`}
        >
          <Text className="font-bold">HangOut</Text>
          <Text className="font-medium">Hub</Text>
        </Text>
      ) : null}
    </View>
  );
}
