import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

type AuthTextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  isDark: boolean;
};

export default function AuthTextField({
  label,
  hint,
  isDark,
  ...props
}: AuthTextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </Text>
      <TextInput
        placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
        className={`rounded-[28px] border px-5 py-4 text-base ${
          isDark
            ? 'border-white/10 bg-white/5 text-white'
            : 'border-slate-200 bg-white text-slate-950'
        }`}
        {...props}
      />
      {hint ? (
        <Text className="mt-2 px-1 text-sm text-slate-500">{hint}</Text>
      ) : null}
    </View>
  );
}
