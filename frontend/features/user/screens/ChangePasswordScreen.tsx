import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import { getApiErrorMessage } from '@/services/api';
import { changePassword } from '@/services/auth/password';
import { haptics } from '@/services/shared/haptics';

const MIN_LENGTH = 6;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDisabled =
    saving || !currentPassword || !password || !confirmPassword;
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';
  const fieldClassName =
    'bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-gray-800 dark:text-white font-medium border border-gray-200 dark:border-gray-800';
  const labelClassName =
    'text-gray-500 dark:text-gray-400 font-medium mb-2 ml-1';

  const handleSubmit = async () => {
    if (!currentPassword || !password || !confirmPassword) {
      Alert.alert(t('commonErrorTitle'), t('changePasswordMissingFields'));
      return;
    }

    if (password.length < MIN_LENGTH) {
      Alert.alert(t('commonErrorTitle'), t('changePasswordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('commonErrorTitle'), t('changePasswordMismatch'));
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, password);
      haptics.success();
      Alert.alert(
        t('changePasswordSuccessTitle'),
        t('changePasswordSuccessMessage'),
        [{ text: t('genericClose'), onPress: () => router.back() }],
      );
    } catch (error) {
      haptics.error();
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('changePasswordErrorFallback')),
      );
    } finally {
      setSaving(false);
    }
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
          <Text className="text-gray-500 dark:text-gray-400 text-lg">
            {t('editProfileCancel')}
          </Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800 dark:text-white">
          {t('changePasswordTitle')}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel={t('changePasswordCta')}
          accessibilityState={{ disabled: isDisabled, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ff4757" />
          ) : (
            <Text
              className={`font-bold text-lg ${
                isDisabled ? 'text-gray-300 dark:text-gray-700' : 'text-[#ff4757]'
              }`}
            >
              {t('changePasswordCta')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="px-5 space-y-6 pt-6">
          <View>
            <Text className={labelClassName}>{t('changePasswordCurrentLabel')}</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showPasswords}
              className={fieldClassName}
              placeholder={t('changePasswordCurrentPlaceholder')}
              placeholderTextColor={placeholderColor}
              autoCapitalize="none"
              accessibilityLabel={t('changePasswordCurrentLabel')}
            />
          </View>

          <View>
            <Text className={`${labelClassName} mt-3`}>
              {t('changePasswordNewLabel')}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPasswords}
              className={fieldClassName}
              placeholder={t('changePasswordNewPlaceholder')}
              placeholderTextColor={placeholderColor}
              autoCapitalize="none"
              accessibilityLabel={t('changePasswordNewLabel')}
            />
          </View>

          <View>
            <Text className={`${labelClassName} mt-3`}>
              {t('changePasswordConfirmLabel')}
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPasswords}
              className={fieldClassName}
              placeholder={t('changePasswordConfirmPlaceholder')}
              placeholderTextColor={placeholderColor}
              autoCapitalize="none"
              accessibilityLabel={t('changePasswordConfirmLabel')}
            />
          </View>

          <TouchableOpacity
            onPress={() => setShowPasswords((value) => !value)}
            accessibilityRole="switch"
            accessibilityState={{ checked: showPasswords }}
            accessibilityLabel={t('changePasswordShowToggle')}
            className="flex-row items-center ml-1 mt-1"
          >
            <Ionicons
              name={showPasswords ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={isDark ? '#9ca3af' : '#6b7280'}
            />
            <Text className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              {t('changePasswordShowToggle')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
