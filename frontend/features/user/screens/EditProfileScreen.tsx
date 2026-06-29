import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import LogoSpinner from '@/shared/ui/LogoSpinner';
import api, { clearAuthState, getImageUrl, isUnauthorizedError } from '@/services/api';
import {
  buildMediaUploadPayload,
  isMediaFileTooLarge,
  isSupportedMediaAsset,
} from '@/services/shared/media-upload';

export default function EditProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    coverUrl: '',
  });
  const [newAvatar, setNewAvatar] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [newCover, setNewCover] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const fetchCurrentProfile = useCallback(async () => {
    try {
      const response = await api.get('/users/me');
      const { username, displayName, bio, avatarUrl, coverUrl } = response.data;
      setForm({
        username: username || '',
        displayName: displayName || '',
        bio: bio || '',
        avatarUrl,
        coverUrl,
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      Alert.alert(t('commonErrorTitle'), t('editProfileLoadError'));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [handleInvalidSession, router, t]);

  useEffect(() => {
    void fetchCurrentProfile();
  }, [fetchCurrentProfile]);

  const pickImage = async (type: 'avatar' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const [pickedAsset] = result.assets;
    if (!pickedAsset) {
      return;
    }

    if (!isSupportedMediaAsset(pickedAsset) || isMediaFileTooLarge(pickedAsset)) {
      Alert.alert(t('mediaValidationTitle'), t('mediaValidationMessage'));
      return;
    }

    if (type === 'avatar') {
      setNewAvatar(pickedAsset);
    } else {
      setNewCover(pickedAsset);
    }
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      Alert.alert(t('commonErrorTitle'), t('editProfileUsernameRequired'));
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('username', form.username);
      formData.append('displayName', form.displayName);
      formData.append('bio', form.bio);

      if (newAvatar) {
        formData.append(
          'avatar',
          buildMediaUploadPayload(newAvatar, 0, 'avatar') as any,
        );
      }

      if (newCover) {
        formData.append(
          'cover',
          buildMediaUploadPayload(newCover, 0, 'cover') as any,
        );
      }

      await api.patch('/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert(t('editProfileSuccessTitle'), t('editProfileSuccessMessage'));
      router.back();
    } catch (error) {
      console.error(error);

      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      Alert.alert(t('commonErrorTitle'), t('editProfileSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <LogoSpinner size={44} />
      </View>
    );
  }

  const displayAvatar = newAvatar
    ? { uri: newAvatar.uri }
    : form.avatarUrl
      ? { uri: getImageUrl(form.avatarUrl) || '' }
      : { uri: 'https://i.pravatar.cc/150' };

  const displayCover = newCover
    ? { uri: newCover.uri }
    : form.coverUrl
      ? { uri: getImageUrl(form.coverUrl) || '' }
      : {
          uri: 'https://images.unsplash.com/photo-1557683316-973673baf926',
        };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row justify-between items-center px-5 pt-16 pb-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('editProfileCancel')}
        >
          <Text className="text-gray-500 dark:text-gray-400 text-lg">{t('editProfileCancel')}</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800 dark:text-white">
          {t('editProfileTitle')}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={t('editProfileSave')}
          accessibilityState={{ disabled: saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ff4757" />
          ) : (
            <Text className="text-[#ff4757] font-bold text-lg">
              {t('editProfileSave')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="items-center mb-6">
          <TouchableOpacity
            onPress={() => pickImage('cover')}
            accessibilityRole="button"
            accessibilityLabel={t('editProfileChangeCoverA11y')}
            className="w-full h-40 bg-gray-200 dark:bg-gray-900 relative"
          >
            <Image source={displayCover} className="w-full h-full opacity-80" />
            <View className="absolute inset-0 justify-center items-center bg-black/20">
              <Ionicons name="camera-outline" size={30} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => pickImage('avatar')}
            accessibilityRole="button"
            accessibilityLabel={t('editProfileChangeAvatarA11y')}
            className="-mt-12 relative"
          >
            <Image
              source={displayAvatar}
              className="w-24 h-24 rounded-full border-4 border-white dark:border-black"
            />
            <View className="absolute bottom-0 right-0 bg-gray-800 p-1.5 rounded-full border-2 border-white dark:border-black">
              <Ionicons name="camera" size={14} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        <View className="px-5 space-y-6">
          <View>
            <Text className="text-gray-500 dark:text-gray-400 font-medium mb-2 ml-1">
              {t('editProfileFullNameLabel')}
            </Text>
            <TextInput
              value={form.displayName}
              onChangeText={(text) => setForm({ ...form, displayName: text })}
              className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-gray-800 dark:text-white font-medium border border-gray-200 dark:border-gray-800"
              placeholder={t('editProfileFullNamePlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
          </View>

          <View>
            <Text className="text-gray-500 dark:text-gray-400 font-medium mb-2 ml-1 mt-3">
              {t('editProfileUsernameLabel')}
            </Text>
            <TextInput
              value={form.username}
              onChangeText={(text) => setForm({ ...form, username: text })}
              className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-gray-800 dark:text-white font-medium border border-gray-200 dark:border-gray-800"
              placeholder={t('editProfileUsernamePlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
          </View>

          <View>
            <Text className="text-gray-500 dark:text-gray-400 font-medium mb-2 ml-1 mt-3">
              {t('editProfileBioLabel')}
            </Text>
            <TextInput
              value={form.bio}
              onChangeText={(text) => setForm({ ...form, bio: text })}
              className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-gray-800 dark:text-white border border-gray-200 dark:border-gray-800 h-32 leading-5"
              placeholder={t('editProfileBioPlaceholder')}
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              multiline
              textAlignVertical="top"
              maxLength={150}
            />
            <Text className="text-right text-gray-400 dark:text-gray-500 text-xs mt-1">
              {form.bio.length}/150
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
