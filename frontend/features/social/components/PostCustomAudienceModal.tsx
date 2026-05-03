import React from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getImageUrl } from '@/services/api';
import type { FriendshipItem } from '@/types/social';

type PostCustomAudienceModalProps = {
  visible: boolean;
  isDark: boolean;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  clearLabel: string;
  confirmLabel: string;
  emptyLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  filteredConnections: FriendshipItem[];
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
  onClear: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

export default function PostCustomAudienceModal({
  visible,
  isDark,
  title,
  subtitle,
  searchPlaceholder,
  clearLabel,
  confirmLabel,
  emptyLabel,
  searchValue,
  onSearchChange,
  loading,
  filteredConnections,
  selectedUserIds,
  onToggleUser,
  onClear,
  onConfirm,
  onClose,
}: PostCustomAudienceModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1 justify-end bg-black/50"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="rounded-t-3xl bg-white p-5 pb-6 dark:bg-gray-900"
          >
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            </View>

            <Text className="mb-1 text-center text-lg font-bold text-gray-800 dark:text-white">
              {title}
            </Text>
            <Text className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </Text>

            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              placeholderTextColor={isDark ? '#666' : '#999'}
              className="rounded-xl bg-gray-50 px-4 py-3 text-base text-gray-800 dark:bg-gray-800 dark:text-white"
            />

            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {loading ? (
                <View className="mt-4 items-center">
                  <ActivityIndicator color="#f39c12" />
                </View>
              ) : filteredConnections.length > 0 ? (
                <View className="mt-4 gap-2">
                  {filteredConnections.map((connection) => {
                    const isSelected = selectedUserIds.includes(connection.user.id);
                    return (
                      <TouchableOpacity
                        key={connection.user.id}
                        onPress={() => onToggleUser(connection.user.id)}
                        className={`flex-row items-center rounded-2xl border px-4 py-3 ${
                          isSelected
                            ? 'border-[#f39c12] bg-[#f39c12]/10'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <Image
                          source={{
                            uri:
                              getImageUrl(connection.user.avatarUrl) ||
                              'https://i.pravatar.cc/150',
                          }}
                          className="mr-3 h-10 w-10 rounded-full"
                        />
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                            {connection.user.displayName || connection.user.username}
                          </Text>
                          {connection.user.username ? (
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              @{connection.user.username}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={22} color="#f39c12" />
                        ) : (
                          <Ionicons
                            name="ellipse-outline"
                            size={22}
                            color={isDark ? '#666' : '#ccc'}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {emptyLabel}
                </Text>
              )}
            </ScrollView>

            <View className="mt-4 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={onClear}
                className="rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-800"
              >
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {clearLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                className="rounded-full bg-[#f39c12] px-5 py-2"
              >
                <Text className="text-sm font-semibold text-white">
                  {confirmLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
