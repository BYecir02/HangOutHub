import React from 'react';
import { Text, View } from 'react-native';

import { useI18n } from '@/hooks/use-i18n';

type AuthStepIndicatorProps = {
  currentStep: number;
  totalSteps: number;
  isDark: boolean;
};

export default function AuthStepIndicator({
  currentStep,
  totalSteps,
  isDark,
}: AuthStepIndicatorProps) {
  const { t } = useI18n();

  return (
    <View className="mb-6">
      <View className="mb-2 flex-row items-center justify-between">
        <Text
          className={`text-xs font-semibold uppercase tracking-[0.24em] ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {t('authFlowLabel')}
        </Text>
        <Text
          className={`text-sm font-medium ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {t('authStepCounter', { current: currentStep, total: totalSteps })}
        </Text>
      </View>

      <View className="flex-row gap-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber <= currentStep;

          return (
            <View
              key={stepNumber}
              className={`h-2 flex-1 rounded-full ${
                isActive
                  ? 'bg-[#4c669f]'
                  : isDark
                    ? 'bg-white/10'
                    : 'bg-slate-200'
              }`}
            />
          );
        })}
      </View>
    </View>
  );
}
