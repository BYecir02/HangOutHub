import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import api from '../../services/api'; 
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!username || !email || !password || !phoneNumber) {
      Alert.alert('Erreur', 'Tout est obligatoire !');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        username,
        email,
        phoneNumber,
        password
      });

      // Succès : On redirige vers le Login
      Alert.alert('Bienvenue ! 🎉', 'Ton compte est créé. Connecte-toi maintenant.');
      
      // ✅ CORRECTION CRITIQUE : On force le retour à l'accueil
      router.replace('/'); 

    } catch (error: any) {
      const message = error.response?.data?.message || "Erreur lors de l'inscription";
      Alert.alert('Oups', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <Ionicons name="person-add" size={50} color="#fff" />
            <Text style={styles.title}>Rejoins le Hub</Text>
            <Text style={styles.subtitle}>Crée ton compte en 1 minute.</Text>
          </View>

          {/* FORMULAIRE (Carte Blanche) */}
          <View style={styles.formCard}>
            <Text style={styles.welcomeText}>Inscription</Text>
            
            {/* Champ Pseudo */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
              <TextInput 
                style={styles.input} 
                placeholder="Nom d'utilisateur" 
                placeholderTextColor="#999"
                value={username} 
                onChangeText={setUsername} 
              />
            </View>

            {/* Champ Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
              <TextInput 
                style={styles.input} 
                placeholder="Email" 
                placeholderTextColor="#999"
                keyboardType="email-address" 
                autoCapitalize="none" 
                value={email} 
                onChangeText={setEmail} 
              />
            </View>

            {/* Champ Téléphone */}
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.icon} />
              <TextInput 
                style={styles.input} 
                placeholder="Téléphone" 
                placeholderTextColor="#999"
                keyboardType="phone-pad" 
                value={phoneNumber} 
                onChangeText={setPhoneNumber} 
              />
            </View>

            {/* Champ Mot de passe */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
              <TextInput 
                style={styles.input} 
                placeholder="Mot de passe (6 carac. min)" 
                placeholderTextColor="#999"
                secureTextEntry 
                value={password} 
                onChangeText={setPassword} 
              />
            </View>

            {/* Bouton Inscription */}
            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>CRÉER MON COMPTE</Text>
              )}
            </TouchableOpacity>

            {/* Retour Login */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Déjà un compte ? </Text>
              {/* ✅ CORRECTION CRITIQUE : router.replace('/') pour éviter le bug GO_BACK */}
              <TouchableOpacity onPress={() => router.replace('/')}>
                <Text style={styles.linkText}>Se connecter</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 10, textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  subtitle: { fontSize: 16, color: '#ddd', marginTop: 5, fontStyle: 'italic' },
  formCard: { backgroundColor: 'white', borderRadius: 25, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  
  // Styles des inputs (Identiques au Login)
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f3f5', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, height: 55 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  
  button: { backgroundColor: '#4c669f', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: '#4c669f', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#666' },
  linkText: { color: '#4c669f', fontWeight: 'bold' },
});