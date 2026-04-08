import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type DividerProps = {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  color?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export default function Divider({
  orientation = 'horizontal',
  thickness = 1,
  color = '#e5e7eb',
  className = '',
  style,
}: DividerProps) {
  const baseStyle: ViewStyle =
    orientation === 'horizontal'
      ? { height: thickness, width: '100%', backgroundColor: color }
      : { width: thickness, alignSelf: 'stretch', backgroundColor: color };

  return <View className={className} style={[baseStyle, style]} />;
}