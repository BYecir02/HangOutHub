import React from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function ScannerScreen() {
  return (
    <ThemedView className="flex-1 justify-center items-center">
      <ThemedText type="title">Scanner 📷</ThemedText>
      <ThemedText className="mt-2 text-gray-500">Caméra pour scanner les billets.</ThemedText>
    </ThemedView>
  );
}
