import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthHeroOrb = {
  style: ViewStyle;
  darkColor: string;
  lightColor?: string;
};

type AuthHeroLayoutProps = {
  isDark: boolean;
  gradientDark: [string, string, string];
  gradientLight: [string, string, string];
  orbs: AuthHeroOrb[];
  children: ReactNode;
};

export default function AuthHeroLayout({
  isDark,
  gradientDark,
  gradientLight,
  orbs,
  children,
}: AuthHeroLayoutProps) {
  return (
    <View className={`flex-1 ${isDark ? 'bg-[#08111f]' : 'bg-[#f8fbff]'}`}>
      <LinearGradient
        colors={isDark ? gradientDark : gradientLight}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      {orbs.map((orb, index) => (
        <View
          // Index is safe here because orb list is static in each screen.
          key={`auth-orb-${index}`}
          className="absolute rounded-full"
          style={{
            ...orb.style,
            backgroundColor: isDark ? orb.darkColor : orb.lightColor || orb.darkColor,
          }}
        />
      ))}

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
