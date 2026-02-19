import React, { useState, useEffect } from 'react';
import { TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import api from '../../services/api';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          console.log("Token trouvé, auto-login...");
          router.replace('/home');
        }
      } catch (e) {
        console.log("Pas de token trouvé");
      }
    };
    checkLogin();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      await SecureStore.setItemAsync('userToken', access_token);
      router.replace('/home'); 
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur de connexion';
      Alert.alert('Oups', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView className="flex-1">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 80, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <ThemedView className="mt-8 mb-14">
            <ThemedText type="title" className="text-[42px] font-bold mb-2 tracking-tight">
              Connexion
            </ThemedText>
            <ThemedText className="text-lg font-normal">
              Découvre. Sors. Profite.
            </ThemedText>
          </ThemedView>

          {/* Inputs - Style Typeform */}
          <ThemedView className="mb-6">
            <ThemedView className="mb-10">
              <TextInput
                className={`text-xl py-4 border-b-2 bg-transparent text-gray-900 dark:text-gray-100 ${
                  focusedField === 'email' 
                    ? 'border-[#4c669f]' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                placeholder="Email"
                placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </ThemedView>
            
            <ThemedView className="mb-10">
              <TextInput
                className={`text-xl py-4 border-b-2 bg-transparent text-gray-900 dark:text-gray-100 ${
                  focusedField === 'password' 
                    ? 'border-[#4c669f]' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                placeholder="Mot de passe"
                placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
            </ThemedView>
          </ThemedView>

          {/* Mot de passe oublié */}
          <TouchableOpacity className="items-end mb-8">
            <ThemedText className="text-sm text-[#4c669f] font-medium">
              Mot de passe oublié ?
            </ThemedText>
          </TouchableOpacity>

          {/* Bouton de connexion */}
          <TouchableOpacity 
            className={`bg-[#4c669f] py-[18px] rounded-xl items-center mb-8 ${loading ? 'opacity-60' : ''}`}
            onPress={handleLogin} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText className="text-white text-lg font-semibold tracking-wide">
                Se connecter
              </ThemedText>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <ThemedView className="flex-row justify-center items-center">
            <ThemedText className="text-base">Pas encore de compte ? </ThemedText>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <ThemedText className="text-base text-[#4c669f] font-semibold">
                S'inscrire
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ThemedView className="h-10" />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
