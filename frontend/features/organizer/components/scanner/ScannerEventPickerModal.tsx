import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import BottomSheetModal from '@/shared/ui/BottomSheetModal';

type EventPickerEvent = {
  id: string;
  title: string;
};

type ScannerEventPickerModalProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  events: EventPickerEvent[];
  selectedEventId: string;
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
};

export default function ScannerEventPickerModal({
  visible,
  title,
  subtitle,
  events,
  selectedEventId,
  onClose,
  onSelectEvent,
}: ScannerEventPickerModalProps) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxHeight={480}
      contentMode="auto"
    >
      <View className="max-h-72">
        <ScrollView showsVerticalScrollIndicator={false}>
          {events.map((event) => {
            const selected = event.id === selectedEventId;
            return (
              <TouchableOpacity
                key={event.id}
                onPress={() => onSelectEvent(event.id)}
                className={selected
                  ? 'mb-2 rounded-2xl border border-[#4c669f] bg-[#4c669f]/10 px-4 py-3'
                  : 'mb-2 rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700'}
              >
                <Text
                  numberOfLines={1}
                  className={selected
                    ? 'text-sm font-semibold text-[#4c669f]'
                    : 'text-sm font-semibold text-gray-800 dark:text-gray-100'}
                >
                  {event.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </BottomSheetModal>
  );
}
