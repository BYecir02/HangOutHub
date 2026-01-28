import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import "../global.css";
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="preferences" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: 'Paramètres', headerBackTitle: 'Retour' }} />
          <Stack.Screen name="create-modal" options={{ presentation: 'transparentModal', headerShown: false, animation: 'none' }} />
          <Stack.Screen name="event" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="outing" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="place" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="search" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
