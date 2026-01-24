import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4c669f', // Bleu principal
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
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
      }}
    >
      {/* 1. ACCUEIL */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 2. DÉCOUVRIR (Anciennement Explore) */}
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Découvrir',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 3. BOUTON CENTRAL : AJOUTER */}
      <Tabs.Screen
        name="create"
        options={{
          title: '', // On cache le texte pour laisser place au gros bouton
          tabBarIcon: () => (
            <View 
              className="bg-[#ff4757] h-14 w-14 rounded-full justify-center items-center shadow-lg shadow-red-500"
              style={{ marginBottom: 20 }} // Le fait ressortir de la barre
            >
              <Ionicons name="add" size={35} color="white" />
            </View>
          ),
        }}
      />

      {/* 4. SOCIAL */}
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 5. PROFIL (MOI) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Moi',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* --- ROUTES CACHÉES (Auth) --- */}
      <Tabs.Screen 
        name="index" 
        options={{ href: null, tabBarStyle: { display: 'none' } }} 
      />
      <Tabs.Screen 
        name="register" 
        options={{ href: null, tabBarStyle: { display: 'none' } }} 
      />
      {/* On cache aussi l'ancien explore si tu ne l'as pas supprimé */}
      <Tabs.Screen 
        name="explore" 
        options={{ href: null }} 
      />
    </Tabs>
  );
}