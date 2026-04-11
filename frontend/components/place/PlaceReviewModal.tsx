import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type PlaceReviewModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  placeholder: string;
  cancelLabel: string;
  submitLabel: string;
  rating: number;
  comment: string;
  submitting: boolean;
  onClose: () => void;
  onChangeRating: (next: number) => void;
  onChangeComment: (next: string) => void;
  onSubmit: () => void;
};

export default function PlaceReviewModal({
  visible,
  title,
  subtitle,
  placeholder,
  cancelLabel,
  submitLabel,
  rating,
  comment,
  submitting,
  onClose,
  onChangeRating,
  onChangeComment,
  onSubmit,
}: PlaceReviewModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="flex-1 items-center justify-center bg-black/60 px-6">
            <View className="w-full max-w-lg rounded-3xl bg-white p-6 dark:bg-gray-900">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {title}
              </Text>
              <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </Text>
              <View className="mt-4 flex-row items-center justify-center">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <TouchableOpacity
                      key={`rating-${value}`}
                      onPress={() => onChangeRating(value)}
                      className="mx-1"
                    >
                      <Ionicons
                        name={value <= rating ? 'star' : 'star-outline'}
                        size={28}
                        color={value <= rating ? '#f59e0b' : '#9ca3af'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                value={comment}
                onChangeText={onChangeComment}
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
                className="mt-4 min-h-[90px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                multiline
                textAlignVertical="top"
              />
              <View className="mt-5 flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 items-center rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700"
                >
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {cancelLabel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSubmit}
                  disabled={submitting}
                  className="flex-1 items-center rounded-2xl bg-[#2ecc71] px-4 py-3"
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">{submitLabel}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
