import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function OrganizerDashboard() {
  const router = useRouter();
  const iconColor = useThemeColor({}, 'icon');
  const cardBg = useThemeColor({ light: '#fff', dark: '#1E1E1E' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#333' }, 'icon');

  // Données simulées
  const stats = {
    revenueToWithdraw: 150000,
    salesToday: 45000,
    nextEvent: {
      title: "Soirée Afrobeat",
      date: "Ce soir à 23h",
      sold: 120,
      total: 200
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <View>
              <ThemedText type="subtitle" style={{ fontSize: 14, opacity: 0.7 }}>Espace Pro</ThemedText>
              <ThemedText type="title">Le Code Bar 🇧🇯</ThemedText>
            </View>
            <TouchableOpacity style={{ padding: 8, borderRadius: 999, backgroundColor: cardBg, borderWidth: 1, borderColor: borderColor }}>
              <Ionicons name="notifications-outline" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>

          {/* Bloc Financier */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
            {/* Carte Revenus */}
            <View style={{ flex: 1, backgroundColor: '#2563eb', padding: 16, borderRadius: 16 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="wallet" size={20} color="white" />
              </View>
              <ThemedText style={{ color: '#dbeafe', fontSize: 12, fontWeight: '500' }}>À retirer (MoMo)</ThemedText>
              <ThemedText style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>{stats.revenueToWithdraw.toLocaleString()} F</ThemedText>
            </View>

            {/* Carte Ventes */}
            <ThemedView style={{ flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: borderColor }}>
              <View style={{ backgroundColor: '#dcfce7', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="trending-up" size={20} color="#16a34a" />
              </View>
              <ThemedText style={{ fontSize: 12, fontWeight: '500', opacity: 0.7 }}>Ventes du jour</ThemedText>
              <ThemedText style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>+{stats.salesToday.toLocaleString()} F</ThemedText>
            </ThemedView>
          </View>

          {/* Événement en cours */}
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Prochain Événement</ThemedText>
          <ThemedView style={{ padding: 20, borderRadius: 16, borderWidth: 1, borderColor: borderColor, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>{stats.nextEvent.title}</ThemedText>
                <ThemedText style={{ color: '#2563eb', marginTop: 4 }}>📅 {stats.nextEvent.date}</ThemedText>
              </View>
              <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <ThemedText style={{ color: '#15803d', fontSize: 10, fontWeight: 'bold' }}>EN VENTE</ThemedText>
              </View>
            </View>
            
            {/* Barre de progression */}
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>Remplissage</ThemedText>
                <ThemedText style={{ fontSize: 12, fontWeight: 'bold' }}>{stats.nextEvent.sold} / {stats.nextEvent.total} tickets</ThemedText>
              </View>
              <View style={{ height: 12, backgroundColor: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                <View 
                  style={{ height: '100%', backgroundColor: '#2563eb', borderRadius: 999, width: `${(stats.nextEvent.sold / stats.nextEvent.total) * 100}%` }} 
                />
              </View>
            </View>

            <TouchableOpacity style={{ marginTop: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: borderColor }}>
              <ThemedText style={{ fontWeight: '600' }}>Gérer les prix & stocks</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Actions Rapides */}
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>Actions Rapides</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
             <TouchableOpacity style={{ width: '48%', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: borderColor, alignItems: 'center' }}>
                <Ionicons name="add-circle" size={32} color="#4c669f" />
                <ThemedText style={{ marginTop: 8, fontWeight: '500' }}>Créer Soirée</ThemedText>
             </TouchableOpacity>
             <TouchableOpacity 
                style={{ width: '48%', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: borderColor, alignItems: 'center' }}
                onPress={() => router.push('/(organizer)/scanner')}
             >
                <Ionicons name="scan" size={32} color="#4c669f" />
                <ThemedText style={{ marginTop: 8, fontWeight: '500' }}>Scanner</ThemedText>
             </TouchableOpacity>
          </View>

        </ScrollView>

        {/* FAB */}
        <TouchableOpacity 
          style={{ position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563eb', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}
          onPress={() => {}}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      </SafeAreaView>
    </ThemedView>
  );
}