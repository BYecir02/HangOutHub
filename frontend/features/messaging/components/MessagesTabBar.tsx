import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '@/shared/hooks/use-i18n';

type Tab = 'outings' | 'direct';

interface MessagesTabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function MessagesTabBar({ activeTab, onTabChange }: MessagesTabBarProps) {
  const { t } = useI18n();

  return (
    <View className="px-5 pb-2">
      <View className="flex-row rounded-full bg-gray-200 p-1 dark:bg-gray-900">
        <TouchableOpacity
          onPress={() => onTabChange('outings')}
          className={`flex-1 items-center rounded-full px-4 py-2 ${
            activeTab === 'outings' ? 'bg-[#4c669f]' : 'bg-transparent'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === 'outings' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('messagesTabOutings')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onTabChange('direct')}
          className={`flex-1 items-center rounded-full px-4 py-2 ${
            activeTab === 'direct' ? 'bg-[#4c669f]' : 'bg-transparent'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              activeTab === 'direct' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('messagesTabDirect')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
