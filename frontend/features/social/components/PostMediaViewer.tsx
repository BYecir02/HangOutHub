import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import MediaFrame from '@/shared/ui/MediaFrame';
import { isVideoUrl } from '@/services/shared/media';
import { getImageUrl } from '../../../services/api';

interface PostMediaViewerProps {
  visible: boolean;
  mediaUrls: string[];
  initialIndex?: number;
  onClose: () => void;
}

function PostMediaViewer({
  visible,
  mediaUrls,
  initialIndex = 0,
  onClose,
}: PostMediaViewerProps) {
  const { width: screenWidth } = Dimensions.get('window');
  const resolvedMedia = useMemo(
    () => mediaUrls.map((uri) => getImageUrl(uri)).filter(Boolean) as string[],
    [mediaUrls],
  );
  const listRef = useRef<FlatList<string>>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setActiveIndex(initialIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    });
  }, [initialIndex, visible]);

  if (!visible || resolvedMedia.length === 0) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <Pressable className="absolute inset-0" onPress={onClose} />

        <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-5 pb-4 pt-14">
          <Pressable
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <View className="rounded-full bg-black/45 px-3 py-1.5">
            <Text className="text-xs font-semibold text-white">
              {activeIndex + 1} / {resolvedMedia.length}
            </Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={resolvedMedia}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / Math.max(event.nativeEvent.layoutMeasurement.width, 1),
            );
            setActiveIndex(index);
          }}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          renderItem={({ item, index }) => {
            const isVideo = isVideoUrl(item);
            const isActive = index === activeIndex;

            return (
              <View className="w-screen flex-1 items-center justify-center">
                <View className="w-full flex-1 bg-black">
                  <MediaFrame
                    source={item}
                    mediaType={isVideo ? 'video' : 'image'}
                    className="w-full flex-1"
                    style={{ width: '100%', height: '100%' }}
                    adaptiveHeight={false}
                    shouldPlay={isActive}
                    muted={false}
                    loop
                    showControls={isVideo}
                    contentFit="contain"
                  />
                </View>
              </View>
            );
          }}
        />
      </View>
    </Modal>
  );
}

export default memo(PostMediaViewer);
