import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type SkeletonBlockProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ className = '', style }: SkeletonBlockProps) {
  return (
    <View
      className={`bg-gray-200 dark:bg-gray-800 ${className}`.trim()}
      style={style}
    />
  );
}
