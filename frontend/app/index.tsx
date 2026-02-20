import React, { useState, useEffect } from 'react';
import { TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import api, { storage } from '@/services/api'; 
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

  // ✅ VÉRIFICATION INTELLIGENTE AU LANCEMENT
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await storage.getItem('userToken');
        const userInfoStr = await storage.getItem('userInfo');

        if (token && userInfoStr) {
          const user = JSON.parse(userInfoStr);
          const isPro = user.role === 'ORGANIZER' || user.role === 'PLACE_OWNER';
          
          // On redirige vers le bon espace
          if (isPro) {
             router.replace('/(organizer)');
          } else {
             router.replace('/(tabs)/home');
          }
        }
      } catch (e) {
        console.log("Pas de session active");
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
      const { access_token, user } = response.data;
      
      // On stocke tout
      await storage.setItem('userToken', access_token);
      await storage.setItem('userInfo', JSON.stringify(user));

      const isPro = user.role === 'ORGANIZER' || user.role === 'PLACE_OWNER';

      if (isPro) {
        if (user.organizerStatus === 'APPROVED') {
          router.replace('/(organizer)/dashboard');
        } else if (user.organizerStatus === 'PENDING') {
          Alert.alert('Patience ⏳', 'Compte en attente de validation.');
          await storage.removeItem('userToken');
        } else {
           router.replace('/(organizer)');
        }
      } else {
        router.replace('/(tabs)/home'); 
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erreur de connexion';
      Alert.alert('Oups', Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView className="flex-1">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 80, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView className="mt-8 mb-14">
            <ThemedText type="title" className="text-[42px] font-bold mb-2 tracking-tight">
              Connexion
            </ThemedText>
            <ThemedText className="text-lg font-normal">
              Découvre. Sors. Profite.
            </ThemedText>
          </ThemedView>

          <ThemedView className="mb-6">
            <ThemedView className="mb-10">
              <TextInput
                className={`text-xl py-4 border-b-2 bg-transparent ${isDark ? 'text-gray-100 border-gray-700' : 'text-gray-900 border-gray-200'} ${focusedField === 'email' ? 'border-[#4c669f]' : ''}`}
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
                className={`text-xl py-4 border-b-2 bg-transparent ${isDark ? 'text-gray-100 border-gray-700' : 'text-gray-900 border-gray-200'} ${focusedField === 'password' ? 'border-[#4c669f]' : ''}`}
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

          <ThemedView className="flex-row justify-center items-center">
            <ThemedText className="text-base">Pas encore de compte ? </ThemedText>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <ThemedText className="text-base text-[#4c669f] font-semibold">
                S'inscrire
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
