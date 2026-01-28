import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInDown, FadeOut, SlideOutDown, Easing, useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export default function CreateModalScreen() {
  const router = useRouter();
  const translateY = useSharedValue(0);

  // Fonction pour annuler complètement (Fermer le modal)
  const handleClose = () => router.back();

  // Geste de glissement (Pan Gesture) - Je l'ai gardé pour pouvoir fermer en glissant
  const gesture = Gesture.Pan()
    .onChange((event) => {
      // On autorise seulement le glissement vers le bas
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd(() => {
      if (translateY.value > 100) {
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  // Fonction pour naviguer vers une page après fermeture du menu
  const navigateTo = (path: string) => {
    // On fait glisser le menu vers le bas (hors écran)
    translateY.value = withTiming(1000, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(router.replace)(path as any);
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View className="flex-1 justify-end"> 
      {/* FOND NOIR SEMI-TRANSPARENT */}
      <Animated.View 
        entering={FadeIn}
        exiting={FadeOut}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      {/* --- LE MENU STYLE PINTEREST (bas de l'écran) --- */}
      <GestureDetector gesture={gesture}>
        <Animated.View 
          entering={SlideInDown}
          exiting={SlideOutDown}
          style={animatedStyle}
          className="bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-10 shadow-2xl"
        >
          
          {/* Petite barre de drag (visuel) */}
          <View className="items-center mb-6">
            <View className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </View>

          <Text className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">
            Que souhaitez-vous ajouter ?
          </Text>

          <View className="flex-row justify-between px-2">
            {/* OPTION 1 : SORTIE */}
            <MenuOption 
              label="Sortie" 
              icon="people" 
              color="#4c669f" 
              onPress={() => navigateTo('/outing')} 
            />

            {/* OPTION 2 : ÉVÉNEMENT */}
            <MenuOption 
              label="Événement" 
              icon="calendar" 
              color="#ff4757" 
              onPress={() => navigateTo('/event')} 
            />

            {/* OPTION 3 : LIEU */}
            <MenuOption 
              label="Lieu" 
              icon="location" 
              color="#2ecc71" 
              onPress={() => navigateTo('/place')} 
            />
          </View>

          {/* Bouton Annuler en bas */}
          <TouchableOpacity onPress={handleClose} className="mt-8 items-center">
            <Text className="text-gray-400 dark:text-gray-500 font-medium">Annuler</Text>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// --- COMPOSANTS UTILITAIRES ---

const MenuOption = ({ label, icon, color, onPress }: { label: string, icon: any, color: string, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} className="items-center space-y-2">
    <View 
      className="w-20 h-20 rounded-2xl justify-center items-center shadow-sm"
      style={{ backgroundColor: `${color}15` }} 
    >
      <Ionicons name={icon} size={32} color={color} />
    </View>
    <Text className="font-bold text-gray-700 dark:text-gray-300 pt-3">{label}</Text>
  </TouchableOpacity>
);