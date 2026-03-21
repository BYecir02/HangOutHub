import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import api from '@/services/api';

interface PreferenceTag {
  id: number;
  name: string;
}

interface PreferenceCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  tags: PreferenceTag[];
}

interface PreferencesResponse {
  categories: PreferenceCategory[];
  selectedTagIds: number[];
}

export default function PreferencesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [categories, setCategories] = useState<PreferenceCategory[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get<PreferencesResponse>('/users/me/preferences');
      setCategories(response.data.categories || []);
      setSelectedTags(response.data.selectedTagIds || []);
    } catch (error) {
      console.error('Erreur chargement preferences:', error);
      setCategories([]);
      setSelectedTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPreferences();
    }, [loadPreferences]),
  );

  const toggleTag = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags((prev) => prev.filter((id) => id !== tagId));
    } else {
      setSelectedTags((prev) => [...prev, tagId]);
    }
  };

  const handleSave = async () => {
    if (selectedTags.length < 3) {
      Alert.alert(
        t('preferencesMinTagTitle'),
        t('preferencesMinTagMessage'),
      );
      return;
    }

    setSaving(true);

    try {
      const response = await api.patch<PreferencesResponse>('/users/me/preferences', {
        tagIds: selectedTags,
      });

      setSelectedTags(response.data.selectedTagIds || selectedTags);
      Alert.alert(t('preferencesSavedTitle'), t('preferencesSavedMessage'), [
        { text: t('preferencesSavedConfirm'), onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Erreur sauvegarde preferences:', error);
      Alert.alert(t('commonErrorTitle'), t('preferencesSaveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <View className="bg-white dark:bg-black shadow-sm z-10">
        <View className="flex-row justify-between items-center px-5 pt-16 pb-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black z-10">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-gray-500 text-lg">{t('preferencesCancel')}</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800 dark:text-white">{t('preferencesTitle')}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#4c669f" />
            ) : (
              <Text
                className={`font-bold text-lg ${
                  selectedTags.length >= 3 ? 'text-[#4c669f]' : 'text-gray-300'
                }`}
              >
                {t('preferencesSave')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {categories.length === 0 ? (
          <View className="rounded-2xl bg-white p-5 dark:bg-gray-900">
            <Text className="text-base text-gray-500 dark:text-gray-400">
              {t('preferencesNoCategory')}
            </Text>
          </View>
        ) : null}

        {categories.map((category) => (
          <View
            key={category.id}
            className="mb-6 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <View className="flex-row items-center mb-4">
              <View
                className="h-6 w-1 rounded-full mr-3"
                style={{ backgroundColor: category.color || '#4c669f' }}
              />
              <Text className="text-lg font-bold text-gray-800 dark:text-white">
                {category.name}
              </Text>
            </View>

            <View className="flex-row flex-wrap">
              {category.tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    activeOpacity={0.7}
                    className={`mr-2 mb-2 px-4 py-2.5 rounded-full border ${
                      isSelected
                        ? 'bg-[#4c669f] border-[#4c669f]'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Text
                      className={`font-medium text-sm ${
                        isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}