import React from 'react';
import { Text, View } from 'react-native';

type ScannerScanResultCardProps = {
  toneClass: string;
  title: string;
  message: string;
  attendeeLabel: string;
  ticketLabel: string;
  attendeeName?: string | null;
  ticketName?: string | null;
};

export default function ScannerScanResultCard({
  toneClass,
  title,
  message,
  attendeeLabel,
  ticketLabel,
  attendeeName,
  ticketName,
}: ScannerScanResultCardProps) {
  return (
    <View className={`mt-4 rounded-2xl border p-4 ${toneClass}`}>
      <Text className="text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-1 text-sm text-gray-700 dark:text-gray-300">
        {message}
      </Text>

      {attendeeName ? (
        <Text className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          {attendeeLabel}: {attendeeName}
        </Text>
      ) : null}

      {ticketName ? (
        <Text className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          {ticketLabel}: {ticketName}
        </Text>
      ) : null}
    </View>
  );
}
