import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-black/35"
        onPress={onClose}
      >
        <Pressable
          className="rounded-t-3xl bg-white p-5 dark:bg-gray-900"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {title}
          </Text>
          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </Text>

          <View className="mt-4 max-h-72">
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
