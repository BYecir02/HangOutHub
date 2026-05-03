import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { ScannerVerificationStatus } from '@/services/organizer-scanner';

export interface RecentScanItemViewModel {
  id: string;
  attendeeName: string;
  ticketName: string;
  status: ScannerVerificationStatus;
  scannedAt: string;
}

type ScannerRecentScansPanelProps = {
  title: string;
  openAllLabel: string;
  emptyLabel: string;
  scans: RecentScanItemViewModel[];
  onOpenAllScans: () => void;
  formatTime: (value: string) => string;
  statusLabelFor: (status: ScannerVerificationStatus) => string;
};

export default function ScannerRecentScansPanel({
  title,
  openAllLabel,
  emptyLabel,
  scans,
  onOpenAllScans,
  formatTime,
  statusLabelFor,
}: ScannerRecentScansPanelProps) {
  return (
    <View className="mt-6 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </Text>
        <TouchableOpacity
          onPress={onOpenAllScans}
          className="rounded-full border border-gray-300 px-3 py-1.5 dark:border-gray-700"
        >
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {openAllLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {scans.length === 0 ? (
        <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {emptyLabel}
        </Text>
      ) : (
        scans.map((item) => (
          <View
            key={item.id}
            className="mt-3 flex-row items-center justify-between rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-800"
          >
            <View className="mr-3 flex-1">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                {item.attendeeName}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
                {item.ticketName}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {statusLabelFor(item.status)}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {formatTime(item.scannedAt)}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
