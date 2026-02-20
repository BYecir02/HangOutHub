import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function EventsScreen() {
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText>Gestion des Événements (Bientôt)</ThemedText>
    </ThemedView>
  );
}