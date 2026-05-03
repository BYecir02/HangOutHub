import React, { forwardRef, type ReactNode } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type EventFormWizardProps = {
  title: string;
  onClose: () => void;
  closeIconColor?: string;
  rightActions?: ReactNode;
  progress?: ReactNode;
  children: ReactNode;
};

const EventFormWizard = forwardRef<ScrollView, EventFormWizardProps>(
  function EventFormWizard(
    { title, onClose, closeIconColor = '#333', rightActions, progress, children },
    ref,
  ) {
    return (
      <View className="flex-1 bg-white pt-14 dark:bg-black">
        <View className="flex-row items-center border-b border-gray-100 px-5 pb-4 dark:border-gray-800">
          <TouchableOpacity
            onPress={onClose}
            className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
          >
            <Ionicons name="close" size={24} color={closeIconColor} />
          </TouchableOpacity>

          <Text className="flex-1 text-xl font-bold text-gray-800 dark:text-white">
            {title}
          </Text>

          {rightActions ? (
            <View className="ml-3 flex-row items-center">{rightActions}</View>
          ) : null}
        </View>

        <ScrollView
          ref={ref}
          className="flex-1 p-5"
          showsVerticalScrollIndicator={false}
        >
          {progress}
          {children}
        </ScrollView>
      </View>
    );
  },
);

export default EventFormWizard;
