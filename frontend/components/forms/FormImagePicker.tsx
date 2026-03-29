import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

type FormImagePickerProps = {
  images: ImagePicker.ImagePickerAsset[];
  coverIndex: number;
  onSelectCover: (index: number) => void;
  onAddPress: () => void;
  addLabel: string;
  coverLabel: string;
  containerClassName?: string;
};

export default function FormImagePicker({
  images,
  coverIndex,
  onSelectCover,
  onAddPress,
  addLabel,
  coverLabel,
  containerClassName = '',
}: FormImagePickerProps) {
  return (
    <View className={containerClassName}>
      <TouchableOpacity
        onPress={onAddPress}
        className="relative h-56 w-full items-center justify-center overflow-hidden rounded-[24px] bg-gray-100 dark:bg-gray-900"
      >
        {images.length > 0 ? (
          <>
            <Image
              source={{ uri: images[coverIndex]?.uri }}
              className="h-full w-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5">
              <Text className="text-xs font-semibold text-white">{coverLabel}</Text>
            </View>
          </>
        ) : (
          <View className="items-center px-6">
            <View className="mb-3 rounded-full bg-gray-200 p-4 dark:bg-gray-800">
              <Ionicons name="images" size={30} color="#9ca3af" />
            </View>
            <Text className="text-center font-medium text-gray-500 dark:text-gray-400">
              {addLabel}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {images.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingHorizontal: 2 }}
        >
          {images.map((image, index) => (
            <TouchableOpacity
              key={`${image.uri}-${index}`}
              onPress={() => onSelectCover(index)}
              className={`mr-3 h-16 w-16 overflow-hidden rounded-lg border-2 ${
                index === coverIndex
                  ? 'border-[#2ecc71]'
                  : 'border-transparent'
              }`}
            >
              <Image source={{ uri: image.uri }} className="h-full w-full" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={onAddPress}
            className="h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
          >
            <Ionicons name="add" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );
}
