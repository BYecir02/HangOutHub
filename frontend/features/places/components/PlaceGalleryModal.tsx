import React from 'react';
import { Modal, ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MediaFrame from '@/components/ui/MediaFrame';

type PlaceGalleryModalProps = {
  visible: boolean;
  gallery: string[];
  index: number;
  onClose: () => void;
};

export default function PlaceGalleryModal({
  visible,
  gallery,
  index,
  onClose,
}: PlaceGalleryModalProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <TouchableOpacity
          onPress={onClose}
          className="absolute right-5 top-12 z-10 rounded-full bg-black/60 p-3"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: screenWidth * index, y: 0 }}
        >
          {gallery.map((image, currentIndex) => (
            <View
              key={`${currentIndex}-${image}`}
              style={{ width: screenWidth, height: screenHeight }}
              className="items-center justify-center"
            >
              <MediaFrame
                source={image}
                className="h-full w-full bg-black"
                shouldPlay={currentIndex === index}
                muted
                loop
                showControls
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
