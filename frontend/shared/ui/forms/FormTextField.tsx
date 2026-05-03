import React from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';

type FormTextFieldProps = TextInputProps & {
  label: string;
  required?: boolean;
  containerClassName?: string;
  inputClassName?: string;
};

export default function FormTextField({
  label,
  required = false,
  containerClassName = '',
  inputClassName = '',
  ...inputProps
}: FormTextFieldProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View className={containerClassName}>
      <Text className="mb-2 ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
        className={`rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white ${inputClassName}`.trim()}
        {...inputProps}
      />
    </View>
  );
}
