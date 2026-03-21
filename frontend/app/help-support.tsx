import React from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useI18n } from '@/hooks/use-i18n';

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
    <ScrollView className="flex-1 bg-gray-50 dark:bg-black pt-16">
      <View className="px-5 pb-10">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#4c669f" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('helpSupportTitle')}
          </Text>
        </View>

        <Text className="text-gray-500 dark:text-gray-400 mb-6">
          {t('helpSupportSubtitle')}
        </Text>

        <View className="rounded-2xl bg-white dark:bg-gray-900 p-5 mb-4">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t('helpSupportFaqTitle')}</Text>
          <Text className="text-gray-700 dark:text-gray-300 mb-2">
            • {t('helpSupportFaqItemData')}
          </Text>
          <Text className="text-gray-700 dark:text-gray-300 mb-2">
            • {t('helpSupportFaqItemSession')}
          </Text>
          <Text className="text-gray-700 dark:text-gray-300">
            • {t('helpSupportFaqItemTunnel')}
          </Text>
        </View>

        <View className="rounded-2xl bg-white dark:bg-gray-900 p-5 mb-4">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">{t('helpSupportContactTitle')}</Text>
          <TouchableOpacity
            onPress={() => void openSupportEmail()}
            className="flex-row items-center rounded-xl bg-[#4c669f] px-4 py-3"
          >
            <Ionicons name="mail-outline" size={20} color="#fff" />
            <Text className="text-white font-semibold ml-2">support@hangouthub.app</Text>
          </TouchableOpacity>
        </View>

        <View className="rounded-2xl bg-white dark:bg-gray-900 p-5">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('helpSupportVersionTitle')}</Text>
          <Text className="text-gray-600 dark:text-gray-300">Hangout Hub v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}