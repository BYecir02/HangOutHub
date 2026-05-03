import React from 'react';
import { ScrollView, View } from 'react-native';

import MediaFrame from '@/components/ui/MediaFrame';

type EventDetailGalleryTabProps = {
  eventId: string;
  gallery: string[];
};

export default function EventDetailGalleryTab({ eventId, gallery }: EventDetailGalleryTabProps) {
  return (
    <View className="pb-2 pt-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
      >
        {gallery.map((image, index) => (
          <MediaFrame
            key={`${eventId}-gallery-${index}`}
            source={image}
            className="mr-3 w-44 shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-800"
            adaptiveHeight
            minHeight={120}
            maxHeight={220}
          />
        ))}
      </ScrollView>
    </View>
  );
}
