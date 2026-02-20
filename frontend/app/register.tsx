// frontend/app/(tabs)/register.tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import api from '../services/api'; 
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RegisterScreen() {
  const [step, setStep] = useState(1); // 1: Choix, 2: Infos Perso, 3: Infos Pro
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('USER'); // 'USER', 'PLACE', 'NOMAD'
  const [companyName, setCompanyName] = useState('');
  const [ifuNumber, setIfuNumber] = useState('');
  const [payoutInfo, setPayoutInfo] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleNext = () => {
    if (step === 2) {
      if (!username || !email || !password || !phoneNumber) {
        Alert.alert('Erreur', 'Les informations de connexion sont obligatoires !');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Erreur', 'Le mot de passe doit faire au moins 6 caractères.');
        return;
      }
      if (accountType === 'USER') {
        submitRegistration();
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      if (!companyName || !ifuNumber || !payoutInfo || !jobTitle) {
        Alert.alert('Erreur', 'Toutes les informations professionnelles sont requises.');
        return;
      }
      submitRegistration();
    }
  };

  const submitRegistration = async () => {
    setLoading(true);
    try {
      if (accountType !== 'USER') {
        await api.post('/auth/register/organizer', {
          username, email, phoneNumber, password,
          accountType, companyName, ifuNumber, payoutInfo, jobTitle
        });
        Alert.alert(
          'Demande envoyée ! ⏳', 
          'Compte Pro créé. En attente de validation par l\'équipe.',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
      } else {
        await api.post('/auth/register', {
          username, email, phoneNumber, password
        });
        Alert.alert('Bienvenue ! 🎉', 'Ton compte est créé. Connecte-toi maintenant.', [{ text: 'Se connecter', onPress: () => router.replace('/') }]);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Erreur lors de l'inscription";
      Alert.alert('Oups', message);
    } finally {
      setLoading(false);
    }
  };

  const selectAccountType = (type: string) => {
    setAccountType(type);
    setStep(2);
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.replace('/');
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
          {/* Bouton Retour */}
          {step > 1 && (
            <TouchableOpacity 
              onPress={goBack} 
              className="absolute top-12 left-5 z-10 p-2"
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={isDark ? '#f3f4f6' : '#111827'} 
              />
            </TouchableOpacity>
          )}

          {/* HEADER */}
          <ThemedView className="mt-8 mb-12">
            <ThemedText type="title" className="text-[42px] font-bold mb-2 tracking-tight">
              {step === 1 ? "Qui êtes-vous ?" : step === 2 ? "Vos identifiants" : "Espace Pro"}
            </ThemedText>
            {step === 1 && (
              <ThemedText className="text-lg font-normal">
                Rejoignez la communauté HangOutHub
              </ThemedText>
            )}
          </ThemedView>
            
          {/* --- ÉTAPE 1 : CHOIX DU PROFIL --- */}
          {step === 1 && (
            <ThemedView className="gap-5 mb-8">
              <TouchableOpacity 
                className={`flex-row items-center justify-start p-5 h-[90px] rounded-2xl border-2 ${
                  accountType === 'USER' 
                    ? 'border-[#4c669f] bg-gray-50 dark:bg-gray-800' 
                    : 'border-transparent bg-gray-50 dark:bg-gray-800'
                }`}
                onPress={() => selectAccountType('USER')}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={28} color="#4c669f" />
                <View className="flex-1 ml-4">
                  <ThemedText className="text-xl font-semibold mb-1">Fêtard</ThemedText>
                  <ThemedText className="text-sm text-gray-600 dark:text-gray-400">Je veux sortir et m'amuser</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                className={`flex-row items-center justify-start p-5 h-[90px] rounded-2xl border-2 ${
                  accountType === 'PLACE' 
                    ? 'border-[#4c669f] bg-gray-50 dark:bg-gray-800' 
                    : 'border-transparent bg-gray-50 dark:bg-gray-800'
                }`}
                onPress={() => selectAccountType('PLACE')}
                activeOpacity={0.7}
              >
                <Ionicons name="business-outline" size={28} color="#4c669f" />
                <View className="flex-1 ml-4">
                  <ThemedText className="text-xl font-semibold mb-1">Établissement</ThemedText>
                  <ThemedText className="text-sm text-gray-600 dark:text-gray-400">Je gère un Bar, Resto, Club...</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                className={`flex-row items-center justify-start p-5 h-[90px] rounded-2xl border-2 ${
                  accountType === 'NOMAD' 
                    ? 'border-[#4c669f] bg-gray-50 dark:bg-gray-800' 
                    : 'border-transparent bg-gray-50 dark:bg-gray-800'
                }`}
                onPress={() => selectAccountType('NOMAD')}
                activeOpacity={0.7}
              >
                <Ionicons name="people-outline" size={28} color="#4c669f" />
                <View className="flex-1 ml-4">
                  <ThemedText className="text-xl font-semibold mb-1">Promoteur</ThemedText>
                  <ThemedText className="text-sm text-gray-600 dark:text-gray-400">J'organise des événements</ThemedText>
                </View>
              </TouchableOpacity>
            </ThemedView>
          )}

          {/* --- ÉTAPE 2 : INFOS PERSO --- */}
          {step === 2 && (
            <ThemedView className="mb-8">
              <ThemedView className="mb-10">
                <TextInput 
                  className={`text-xl py-4 border-b-2 bg-transparent text-gray-900 dark:text-gray-100 ${
                    focusedField === 'username' 
                      ? 'border-[#4c669f]' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Nom d'utilisateur" 
                  placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                  value={username} 
                  onChangeText={setUsername}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                />
              </ThemedView>

              <ThemedView className="mb-10">
                <TextInput 
                  className={`text-xl py-4 border-b-2 bg-transparent text-gray-900 dark:text-gray-100 ${
                    focusedField === 'email' 
                      ? 'border-[#4c669f]' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Email" 
                  placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                  keyboardType="email-address" 
                  autoCapitalize="none" 
                  value={email} 
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </ThemedView>

              <ThemedView className="mb-10">
                <TextInput 
                  className={`text-xl py-4 border-b-2 bg-transparent text-gray-900 dark:text-gray-100 ${
                    focusedField === 'phoneNumber' 
                      ? 'border-[#4c669f]' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Téléphone" 
                  placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                  keyboardType="phone-pad" 
                  value={phoneNumber} 
                  onChangeText={setPhoneNumber}
                  onFocus={() => setFocusedField('phoneNumber')}
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
                  placeholder="Mot de passe (6 carac. min)" 
                  placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                  secureTextEntry 
                  value={password} 
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
              </ThemedView>
            </ThemedView>
          )}

          {/* --- ÉTAPE 3 : INFOS PRO --- */}
          {step === 3 && (
            <ThemedView className="mb-8">
              <ThemedView className="mb-10">
                <TextInput 
                  className={`text-xl py-4 border-b-2 bg-transparent text-gray-900 dark:text-gray-100 ${
                    focusedField === 'companyName' 
                      ? 'border-[#4c669f]' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Nom de l'entreprise" 
                  placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                  value={companyName} 
                  onChangeText={setCompanyName}
                  onFocus={() => setFocusedField('companyName')}
                  onBlur={() => setFocusedField(null)}
                />
              </ThemedView>

              <ThemedView className="mb-10">
                <TextInput 
                  className={`text-xl py-4 border-b-2 bg-transparent text-gray-900 dark:text-gray-100 ${
                    focusedField === 'ifuNumber' 
                      ? 'border-[#4c669f]' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Numéro IFU" 
                  placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                  value={ifuNumber} 
                  onChangeText={setIfuNumber}
                  onFocus={() => setFocusedField('ifuNumber')}
                  onBlur={() => setFocusedField(null)}
                />
              </ThemedView>

              <ThemedView className="mb-10">
                <TextInput 
                  className={`text-xl py-4 border-b-2 bg-transparent text-gray-900 dark:text-gray-100 ${
                    focusedField === 'jobTitle' 
                      ? 'border-[#4c669f]' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Votre Rôle (Gérant, etc.)" 
                  placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                  value={jobTitle} 
                  onChangeText={setJobTitle}
                  onFocus={() => setFocusedField('jobTitle')}
                  onBlur={() => setFocusedField(null)}
                />
              </ThemedView>

              <ThemedView className="mb-10">
                <TextInput 
                  className={`text-xl py-4 border-b-2 bg-transparent text-gray-900 dark:text-gray-100 ${
                    focusedField === 'payoutInfo' 
                      ? 'border-[#4c669f]' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Compte Reversement (MoMo)" 
                  placeholderTextColor={isDark ? '#9ca3af' : '#9ca3af'}
                  value={payoutInfo} 
                  onChangeText={setPayoutInfo}
                  onFocus={() => setFocusedField('payoutInfo')}
                  onBlur={() => setFocusedField(null)}
                />
              </ThemedView>
            </ThemedView>
          )}

          {/* Bouton d'action */}
          {step > 1 && (
            <TouchableOpacity 
              className={`bg-[#4c669f] py-[18px] rounded-xl items-center mt-6 mb-8 ${loading ? 'opacity-60' : ''}`}
              onPress={handleNext} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText className="text-white text-lg font-semibold tracking-wide">
                  {step === 2 && accountType !== 'USER' ? "Suivant" : (accountType === 'USER' ? "Créer mon compte" : "Envoyer ma demande")}
                </ThemedText>
              )}
            </TouchableOpacity>
          )}

          {/* Retour Login */}
          {step === 1 && (
            <ThemedView className="flex-row justify-center items-center">
              <ThemedText className="text-base">Déjà un compte ? </ThemedText>
              <TouchableOpacity onPress={() => router.replace('/')}>
                <ThemedText className="text-base text-[#4c669f] font-semibold">
                  Se connecter
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          <ThemedView className="h-10" />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
