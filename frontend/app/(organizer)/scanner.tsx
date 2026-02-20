import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function ScannerScreen() {
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText>Scanner QR Code (Bientôt)</ThemedText>
    </ThemedView>
  );
}