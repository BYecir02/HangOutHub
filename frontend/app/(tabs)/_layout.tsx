import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const activeTint = isDark ? '#d6ddff' : '#4c669f';
  const inactiveTint = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const addButtonBg = isDark ? '#ff5c7a' : '#ff4757';
  const addButtonShadow = isDark ? '#ff2f5f' : '#ff3b30';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        headerShown: false,
        sceneContainerStyle: { backgroundColor: 'transparent' },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>

            {/* 1. Blur principal — intensité haute pour vrai effet verre */}
            <BlurView
              intensity={isDark ? 60 : 80}
              tint={isDark ? 'dark' : 'extraLight'}
              style={StyleSheet.absoluteFill}
            />

            {/* 2. Teinte de base très légère — laisse transparaître le contenu */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark
                    ? 'rgba(20, 20, 35, 0.35)'
                    : 'rgba(255, 255, 255, 0.25)',
                },
              ]}
            />

            {/* 3. Reflet spéculaire en haut — donne l'illusion du verre */}
            <LinearGradient
              pointerEvents="none"
              colors={
                isDark
                  ? [
                      'rgba(255,255,255,0.18)',
                      'rgba(255,255,255,0.06)',
                      'rgba(255,255,255,0.00)',
                    ]
                  : [
                      'rgba(255,255,255,0.95)',
                      'rgba(255,255,255,0.30)',
                      'rgba(255,255,255,0.00)',
                    ]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { height: '55%' }]}
            />

            {/* 4. Ligne "bord de verre" en haut */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.25)'
                  : 'rgba(255,255,255,0.90)',
              }}
            />

            {/* 5. Micro-bordure basse (effet "épaisseur") */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.06)',
              }}
            />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowColor: '#6366f1',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.12,
          shadowRadius: 20,
          height: 85,
          paddingBottom: 25,
          paddingTop: 5,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
        },
      }}
    >
      {/* 1. ACCUEIL */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 2. CARTE */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 3. BOUTON CENTRAL : AJOUTER */}
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: () => (
            <View
              style={{
                height: 56,
                width: 56,
                borderRadius: 28,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                backgroundColor: addButtonBg,
                shadowColor: addButtonShadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              <Ionicons name="add" size={35} color="white" />
            </View>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            router.push('/create-modal');
          },
        })}
      />

      {/* 4. SOCIAL */}
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 5. PROFIL */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Moi',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}