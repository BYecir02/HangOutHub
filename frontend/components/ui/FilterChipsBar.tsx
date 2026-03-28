import React from 'react';
import { FlatList, Text, TouchableOpacity } from 'react-native';

import { uiTokens } from '@/theme/tokens';

export type FilterChipOption<T extends string = string> = {
  key: T;
  label: string;
};

type FilterChipsBarProps<T extends string = string> = {
  options: readonly FilterChipOption<T>[];
  activeKey: T;
  onChange: (next: T) => void;
  activeColor?: string;
  textSize?: 'xs' | 'sm';
  className?: string;
  horizontalPadding?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

export default function FilterChipsBar<T extends string = string>({
  options,
  activeKey,
  onChange,
  activeColor = '#4c669f',
  textSize = 'xs',
  className = '',
  horizontalPadding = uiTokens.spacing.screenX,
  paddingTop = 18,
  paddingBottom = 10,
}: FilterChipsBarProps<T>) {
  return (
    <FlatList
      horizontal
      data={options}
      keyExtractor={(item) => item.key}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: horizontalPadding,
        paddingTop,
        paddingBottom,
      }}
      renderItem={({ item }) => {
        const active = item.key === activeKey;

        return (
          <TouchableOpacity
            onPress={() => onChange(item.key)}
            className="mr-3 rounded-full border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900"
            style={
              active
                ? { borderColor: activeColor, backgroundColor: activeColor }
                : undefined
            }
          >
            <Text
              className={`${textSize === 'sm' ? 'text-sm' : 'text-xs'} font-semibold ${
                active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
              }`.trim()}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      }}
      style={{ flexGrow: 0 }}
      className={className}
    />
  );
}
