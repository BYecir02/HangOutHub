import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthStepIndicator from '@/components/auth/AuthStepIndicator';
import AuthTextField from '@/components/auth/AuthTextField';
import RoleOptionCard from '@/components/auth/RoleOptionCard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import api from '@/services/api';

type AccountType = 'USER' | 'PLACE' | 'NOMAD';

const ACCOUNT_OPTIONS: Record<
  AccountType,
  {
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    accentColor: string;
    roleLabel: string;
  }
> = {
  USER: {
    title: 'Fetard',
    description: 'Je veux explorer les lieux, suivre les events et publier mes sorties.',
    icon: 'sparkles-outline',
    accentColor: '#f39c12',
    roleLabel: 'Public',
  },
  PLACE: {
    title: 'Etablissement',
    description: 'Je gere un lieu et je veux publier une adresse qui donne envie.',
    icon: 'business-outline',
    accentColor: '#2ecc71',
    roleLabel: 'Lieu',
  },
  NOMAD: {
    title: 'Promoteur',
    description: 'J organise des evenements et je veux activer ma communaute.',
    icon: 'radio-outline',
    accentColor: '#ff4757',
    roleLabel: 'Event',
  },
};

function getStepTitle(step: number) {
  if (step === 1) {
    return 'Choisis ta place';
  }

  if (step === 2) {
    return 'Pose tes bases';
  }

  return 'Cadre pro';
}

function getStepDescription(step: number, accountType: AccountType) {
  if (step === 1) {
    return 'On adapte le parcours selon ton role dans l application.';
  }

  if (step === 2) {
    return accountType === 'USER'
      ? 'Quelques infos et tu peux commencer a decouvrir la ville.'
      : 'On cree ton compte avant de passer a la partie professionnelle.';
  }

  return 'Les infos pro servent a rendre ton espace plus credible et plus propre.';
}

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('USER');
  const [companyName, setCompanyName] = useState('');
  const [ifuNumber, setIfuNumber] = useState('');
  const [payoutInfo, setPayoutInfo] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const accentColor = ACCOUNT_OPTIONS[accountType].accentColor;
  const totalSteps = accountType === 'USER' ? 2 : 3;

  const ctaLabel = useMemo(() => {
    if (loading) {
      return '';
    }

    if (step === 2 && accountType !== 'USER') {
      return 'Continuer';
    }

    return accountType === 'USER' ? 'Creer mon compte' : 'Envoyer ma demande';
  }, [accountType, loading, step]);

  const submitRegistration = async () => {
    setLoading(true);

    try {
      if (accountType !== 'USER') {
        await api.post('/auth/register/organizer', {
          username,
          email,
          phoneNumber,
          password,
          accountType,
          companyName,
          ifuNumber,
          payoutInfo,
          jobTitle,
        });

        Alert.alert(
          'Demande envoyee',
          'Compte pro cree. Il sera visible apres validation de l equipe.',
          [{ text: 'Retour au login', onPress: () => router.replace('/') }],
        );
      } else {
        await api.post('/auth/register', {
          username,
          email,
          phoneNumber,
          password,
        });

        Alert.alert(
          'Compte cree',
          'Ton compte est pret. Tu peux maintenant te connecter.',
          [{ text: 'Se connecter', onPress: () => router.replace('/') }],
        );
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Erreur lors de l'inscription";
      Alert.alert('Oups', Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 2) {
      if (!username || !email || !password || !phoneNumber) {
        Alert.alert('Erreur', 'Les informations de connexion sont obligatoires.');
        return;
      }

      if (password.length < 6) {
        Alert.alert('Erreur', 'Le mot de passe doit faire au moins 6 caracteres.');
        return;
      }

      if (accountType === 'USER') {
        void submitRegistration();
      } else {
        setStep(3);
      }

      return;
    }

    if (step === 3) {
      if (!companyName || !ifuNumber || !payoutInfo || !jobTitle) {
        Alert.alert('Erreur', 'Toutes les informations professionnelles sont requises.');
        return;
      }

      void submitRegistration();
    }
  };

  const selectAccountType = (type: AccountType) => {
    setAccountType(type);
    setStep(2);
  };

  const goBack = () => {
    if (step > 1) {
      setStep((previousStep) => previousStep - 1);
      return;
    }

    router.replace('/');
  };

  return (
    <View className="flex-1 bg-[#08111f]">
      <LinearGradient
        colors={
          isDark
            ? ['#08111f', '#151f36', '#20111f']
            : ['#eef4ff', '#fff3e4', '#ffffff']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <View className="absolute left-[-40px] top-24 h-48 w-48 rounded-full bg-[#4c669f24]" />
      <View className="absolute bottom-24 right-[-56px] h-56 w-56 rounded-full bg-[#ff47571c]" />
      <View className="absolute right-12 top-28 h-24 w-24 rounded-full bg-[#2ecc7124]" />

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
            <View className="flex-row items-center justify-between pt-2">
              <TouchableOpacity
                onPress={goBack}
                className={`h-12 w-12 items-center justify-center rounded-2xl ${
                  isDark ? 'bg-white/10' : 'bg-white/80'
                }`}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={isDark ? '#ffffff' : '#0f172a'}
                />
              </TouchableOpacity>

              {step > 1 ? (
                <View
                  className="rounded-full px-4 py-2"
                  style={{ backgroundColor: `${accentColor}22` }}
                >
                  <Text style={{ color: accentColor }} className="text-xs font-semibold uppercase tracking-[0.22em]">
                    {ACCOUNT_OPTIONS[accountType].roleLabel}
                  </Text>
                </View>
              ) : (
                <View />
              )}
            </View>

            <View className="pt-6">
              <Text
                className={`text-[38px] font-black leading-[42px] ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {getStepTitle(step)}
              </Text>
              <Text
                className={`mt-4 max-w-[92%] text-base leading-7 ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {getStepDescription(step, accountType)}
              </Text>
            </View>

            <View
              className={`mt-8 rounded-[36px] border p-6 ${
                isDark
                  ? 'border-white/10 bg-[#07101dcc]'
                  : 'border-white/90 bg-white'
              }`}
            >
              <AuthStepIndicator
                currentStep={step}
                totalSteps={totalSteps}
                isDark={isDark}
              />

              {step === 1 ? (
                <View>
                  <RoleOptionCard
                    title={ACCOUNT_OPTIONS.USER.title}
                    description={ACCOUNT_OPTIONS.USER.description}
                    icon={ACCOUNT_OPTIONS.USER.icon}
                    accentColor={ACCOUNT_OPTIONS.USER.accentColor}
                    isDark={isDark}
                    selected={accountType === 'USER'}
                    onPress={() => selectAccountType('USER')}
                  />
                  <RoleOptionCard
                    title={ACCOUNT_OPTIONS.PLACE.title}
                    description={ACCOUNT_OPTIONS.PLACE.description}
                    icon={ACCOUNT_OPTIONS.PLACE.icon}
                    accentColor={ACCOUNT_OPTIONS.PLACE.accentColor}
                    isDark={isDark}
                    selected={accountType === 'PLACE'}
                    onPress={() => selectAccountType('PLACE')}
                  />
                  <RoleOptionCard
                    title={ACCOUNT_OPTIONS.NOMAD.title}
                    description={ACCOUNT_OPTIONS.NOMAD.description}
                    icon={ACCOUNT_OPTIONS.NOMAD.icon}
                    accentColor={ACCOUNT_OPTIONS.NOMAD.accentColor}
                    isDark={isDark}
                    selected={accountType === 'NOMAD'}
                    onPress={() => selectAccountType('NOMAD')}
                  />
                </View>
              ) : null}

              {step === 2 ? (
                <View>
                  <AuthTextField
                    label="Nom d'utilisateur"
                    isDark={isDark}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    placeholder="amina, novaevents..."
                  />
                  <AuthTextField
                    label="Email"
                    isDark={isDark}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="contact@hangouthub.dev"
                  />
                  <AuthTextField
                    label="Telephone"
                    isDark={isDark}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholder="+229 97 00 00 00"
                  />
                  <AuthTextField
                    label="Mot de passe"
                    isDark={isDark}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="6 caracteres minimum"
                  />
                </View>
              ) : null}

              {step === 3 ? (
                <View>
                  <AuthTextField
                    label="Nom de l'activite"
                    isDark={isDark}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Nova Events, Code District..."
                  />
                  <AuthTextField
                    label="Numero IFU"
                    isDark={isDark}
                    value={ifuNumber}
                    onChangeText={setIfuNumber}
                    placeholder="IFU-2026-..."
                  />
                  <AuthTextField
                    label="Role"
                    isDark={isDark}
                    value={jobTitle}
                    onChangeText={setJobTitle}
                    placeholder="Gerant, fondatrice, directeur artistique..."
                  />
                  <AuthTextField
                    label="Reversement"
                    isDark={isDark}
                    value={payoutInfo}
                    onChangeText={setPayoutInfo}
                    placeholder="Numero MoMo ou IBAN"
                    hint="Ces informations servent uniquement a preparer le compte pro."
                  />
                </View>
              ) : null}

              {step > 1 ? (
                <TouchableOpacity
                  onPress={handleNext}
                  disabled={loading}
                  activeOpacity={0.9}
                  className={`mt-4 self-stretch overflow-hidden rounded-[28px] ${
                    loading ? 'opacity-70' : ''
                  }`}
                >
                  <LinearGradient
                    colors={[accentColor, '#4c669f']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="w-full items-center rounded-[28px] px-6 py-[18px]"
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="text-base font-semibold text-white">
                        {ctaLabel}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
            </View>

            {step === 1 ? (
              <View className="mt-8 flex-row items-center justify-center">
                <Text
                  className={`text-sm ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  Deja un compte ?
                </Text>
                <TouchableOpacity onPress={() => router.replace('/')}>
                  <Text className="ml-2 text-sm font-semibold text-[#4c669f]">
                    Retour au login
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
