import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ScreenHeader from '@/shared/ui/ScreenHeader';
import { useI18n } from '@/shared/hooks/use-i18n';

const SUPPORT_EMAIL = 'support@hangouthub.app';

export default function HelpSupportScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faq = [
    { q: t('helpSupportFaqQ1'), a: t('helpSupportFaqA1') },
    { q: t('helpSupportFaqQ2'), a: t('helpSupportFaqA2') },
    { q: t('helpSupportFaqQ3'), a: t('helpSupportFaqA3') },
    { q: t('helpSupportFaqQ4'), a: t('helpSupportFaqA4') },
  ];

  const openSupportEmail = async () => {
    const subject = encodeURIComponent(t('helpSupportMailSubject'));
    const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;

    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
        return;
      }
    } catch {
      // On retombe sur le message de repli ci-dessous.
    }

    // Aucune app mail : on affiche l'adresse pour que l'utilisateur la copie.
    Alert.alert(
      t('helpSupportContactFallbackTitle'),
      `${t('helpSupportContactFallbackMessage')}\n\n${SUPPORT_EMAIL}`,
    );
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

        <View className="mb-4 overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
          <Text className="px-5 pt-5 text-lg font-bold text-gray-900 dark:text-white">
            {t('helpSupportFaqTitle')}
          </Text>

          {faq.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <View
                key={item.q}
                className={`px-5 ${index === faq.length - 1 ? 'pb-2' : 'border-b border-gray-100 dark:border-gray-800'}`}
              >
                <TouchableOpacity
                  onPress={() => setOpenIndex(isOpen ? null : index)}
                  accessibilityRole="button"
                  accessibilityLabel={item.q}
                  accessibilityState={{ expanded: isOpen }}
                  className="flex-row items-center py-4"
                >
                  <Text className="flex-1 pr-3 text-base font-semibold text-gray-800 dark:text-gray-100">
                    {item.q}
                  </Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#9ca3af"
                  />
                </TouchableOpacity>

                {isOpen ? (
                  <Text className="pb-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {item.a}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        <View className="mb-4 rounded-2xl bg-white p-5 dark:bg-gray-900">
          <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
            {t('helpSupportContactTitle')}
          </Text>
          <Text className="mb-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {t('helpSupportContactDescription')}
          </Text>
          <TouchableOpacity
            onPress={() => void openSupportEmail()}
            accessibilityRole="button"
            accessibilityLabel={SUPPORT_EMAIL}
            className="flex-row items-center justify-center rounded-xl bg-[#ff4757] px-4 py-3"
          >
            <Ionicons name="mail-outline" size={20} color="#fff" />
            <Text className="ml-2 font-semibold text-white">{SUPPORT_EMAIL}</Text>
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
