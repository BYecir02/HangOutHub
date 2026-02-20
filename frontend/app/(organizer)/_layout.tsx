import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function OrganizerLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4c669f', // Bleu principal
        tabBarInactiveTintColor: isDark ? '#9ca3af' : 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#fff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: 85,
          paddingBottom: 25,
          paddingTop: 5,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? "stats-chart" : "stats-chart-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Événements',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? "calendar" : "calendar-outline"} color={color} />
          ),
        }}
      />

      {/* 3. BOUTON CENTRAL : CRÉER */}
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => (
            <View 
              className="bg-[#ff4757] h-14 w-14 rounded-full justify-center items-center shadow-lg shadow-red-500"
              style={{ marginBottom: 20 }}
            >
              <Ionicons name="add" size={35} color="white" />
            </View>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            router.push('/create-event'); // Redirection vers la page à la racine
          },
        })}
      />

      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? "qr-code" : "qr-code-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Vitrine',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? "storefront" : "storefront-outline"} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
