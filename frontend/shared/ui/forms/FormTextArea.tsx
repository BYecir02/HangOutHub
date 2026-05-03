import React from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

type FormTextAreaProps = Omit<TextInputProps, 'multiline'> & {
  label: string;
  required?: boolean;
  containerClassName?: string;
  inputClassName?: string;
  minHeight?: number;
};

export default function FormTextArea({
  label,
  required = false,
  containerClassName = '',
  inputClassName = '',
  minHeight = 128,
  ...inputProps
}: FormTextAreaProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View className={containerClassName}>
      <Text className="mb-2 ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <TextInput
        multiline
        textAlignVertical="top"
        placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
        className={`rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white ${inputClassName}`.trim()}
        style={{ minHeight }}
        {...inputProps}
      />
    </View>
  );
}
