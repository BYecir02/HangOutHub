import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type * as ImagePicker from 'expo-image-picker';

type ChatComposerProps = {
  inputRef: React.RefObject<TextInput | null>;
  input: string;
  onChangeInput: (value: string) => void;
  placeholder: string;
  pendingImages: ImagePicker.ImagePickerAsset[];
  onRemoveImage: (uri: string) => void;
  onPickImages: () => void;
  onSend: () => void;
  sending: boolean;
  sendEnabled: boolean;
  isDark: boolean;
  uploadProgress?: number | null;
};

export function ChatComposer({
  inputRef,
  input,
  onChangeInput,
  placeholder,
  pendingImages,
  onRemoveImage,
  onPickImages,
  onSend,
  sending,
  sendEnabled,
  isDark,
  uploadProgress,
}: ChatComposerProps) {
  return (
    <>
      {pendingImages.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          <View className="flex-row">
            {pendingImages.map((image) => (
              <View key={image.uri} className="mr-3">
                <TouchableOpacity
                  onPress={() => onRemoveImage(image.uri)}
                  className="absolute right-1 top-1 z-10 h-6 w-6 items-center justify-center rounded-full bg-black/60"
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
                <Image
                  source={{ uri: image.uri }}
                  className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}

      <View className="flex-row items-center gap-2 rounded-2xl border border-gray-200 px-2 py-2 dark:border-gray-800">
        <TouchableOpacity
          onPress={onPickImages}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
        >
          <Ionicons name="image-outline" size={20} color="#4c669f" />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={onChangeInput}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          className="flex-1 h-10 text-base text-gray-900 dark:text-white"
          style={{
            paddingTop: 0,
            paddingBottom: 0,
            includeFontPadding: false,
          }}
          textAlignVertical="center"
          multiline={false}
        />
        <TouchableOpacity
          onPress={onSend}
          disabled={sending || !sendEnabled}
          className={`h-10 w-10 items-center justify-center rounded-full ${
            sending || !sendEnabled
              ? 'bg-gray-200 dark:bg-gray-800'
              : 'bg-gray-900 dark:bg-white'
          }`}
        >
          {sending ? (
            <ActivityIndicator
              color={
                sending || !sendEnabled ? '#6b7280' : isDark ? '#111827' : '#ffffff'
              }
            />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={
                sending || !sendEnabled ? '#6b7280' : isDark ? '#111827' : '#ffffff'
              }
            />
          )}
        </TouchableOpacity>
      </View>
      {typeof uploadProgress === 'number' ? (
        <View className="mt-2 px-1">
          <View className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-800">
            <View
              className="h-full rounded-full bg-[#4c669f]"
              style={{ width: `${Math.max(8, Math.round(uploadProgress * 100))}%` }}
            />
          </View>
        </View>
      ) : null}
    </>
  );
}
