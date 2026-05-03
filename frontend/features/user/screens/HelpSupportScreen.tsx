import React from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ScreenHeader from '@/shared/ui/ScreenHeader';
import { useI18n } from '@/shared/hooks/use-i18n';

export default function HelpSupportScreen() {
  const router = useRouter();
  const { t } = useI18n();

  const openSupportEmail = async () => {
    const subject = encodeURIComponent(t('helpSupportMailSubject'));
    const emailUrl = `mailto:support@hangouthub.app?subject=${subject}`;
    const canOpen = await Linking.canOpenURL(emailUrl);
    if (canOpen) {
      await Linking.openURL(emailUrl);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-10">
        <ScreenHeader
          title={t('helpSupportTitle')}
          subtitle={t('helpSupportSubtitle')}
          onBack={() => router.back()}
          containerClassName="mb-6"
        />

        <View className="mb-4 rounded-2xl bg-white p-5 dark:bg-gray-900">
          <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
            {t('helpSupportFaqTitle')}
          </Text>
          <Text className="mb-2 text-gray-700 dark:text-gray-300">
            - {t('helpSupportFaqItemData')}
          </Text>
          <Text className="mb-2 text-gray-700 dark:text-gray-300">
            - {t('helpSupportFaqItemSession')}
          </Text>
          <Text className="text-gray-700 dark:text-gray-300">
            - {t('helpSupportFaqItemTunnel')}
          </Text>
        </View>

        <View className="mb-4 rounded-2xl bg-white p-5 dark:bg-gray-900">
          <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
            {t('helpSupportContactTitle')}
          </Text>
          <TouchableOpacity
            onPress={() => void openSupportEmail()}
            className="flex-row items-center rounded-xl bg-[#4c669f] px-4 py-3"
          >
            <Ionicons name="mail-outline" size={20} color="#fff" />
            <Text className="ml-2 font-semibold text-white">support@hangouthub.app</Text>
          </TouchableOpacity>
        </View>

        <View className="rounded-2xl bg-white p-5 dark:bg-gray-900">
          <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
            {t('helpSupportVersionTitle')}
          </Text>
          <Text className="text-gray-600 dark:text-gray-300">Hangout Hub v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}
