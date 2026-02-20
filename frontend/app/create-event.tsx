import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Image, Alert, Platform, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import api from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CreateEventScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!title || !startTime || !entryFee) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires (Titre, Date, Prix)');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('startTime', startTime.toISOString());
      formData.append('entryFee', entryFee);

      if (coverImage) {
        const filename = coverImage.split('/').pop() || 'cover.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        // @ts-ignore: React Native FormData specific
        formData.append('cover', { uri: coverImage, name: filename, type });
      }

      await api.post('/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Succès 🎉', 'Votre événement a été créé !', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Erreur', error.response?.data?.message || "Impossible de créer l'événement");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartTime(selectedDate);
    }
  };

  return (
    <ThemedView className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4 border-b border-gray-200 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ThemedText className="text-lg text-[#4c669f]">Annuler</ThemedText>
        </TouchableOpacity>
        <ThemedText type="defaultSemiBold" className="text-lg">Nouvel Événement</ThemedText>
        <TouchableOpacity onPress={handleSubmit} disabled={loading} className="p-2">
          {loading ? <ActivityIndicator color="#4c669f" /> : <ThemedText className="text-lg font-bold text-[#4c669f]">Publier</ThemedText>}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-5">
        {/* Image Cover */}
        <TouchableOpacity onPress={pickImage} className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 justify-center items-center overflow-hidden border border-dashed border-gray-300 dark:border-gray-700">
          {coverImage ? (
            <Image source={{ uri: coverImage }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center">
              <Ionicons name="image-outline" size={40} color="#9ca3af" />
              <ThemedText className="text-gray-400 mt-2">Ajouter une couverture</ThemedText>
            </View>
          )}
        </TouchableOpacity>

        {/* Titre */}
        <View className="mb-6">
          <ThemedText className="mb-2 font-medium opacity-70">Titre de la soirée</ThemedText>
          <TextInput
            className={`p-4 rounded-xl text-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'}`}
            placeholder="Ex: Soirée Afrobeat..."
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Date & Heure */}
        <View className="mb-6">
          <ThemedText className="mb-2 font-medium opacity-70">Date et Heure</ThemedText>
          <TouchableOpacity 
            onPress={() => setShowStartPicker(true)}
            className={`p-4 rounded-xl flex-row items-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}
          >
            <Ionicons name="calendar-outline" size={20} color="#4c669f" style={{ marginRight: 10 }} />
            <ThemedText>{startTime.toLocaleString()}</ThemedText>
          </TouchableOpacity>
          {showStartPicker && (
            <DateTimePicker
              value={startTime}
              mode="datetime"
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>

        {/* Prix */}
        <View className="mb-6">
          <ThemedText className="mb-2 font-medium opacity-70">Prix d'entrée (FCFA)</ThemedText>
          <TextInput
            className={`p-4 rounded-xl text-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'}`}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={entryFee}
            onChangeText={setEntryFee}
          />
        </View>

        {/* Description */}
        <View className="mb-10">
          <ThemedText className="mb-2 font-medium opacity-70">Description</ThemedText>
          <TextInput
            className={`p-4 rounded-xl text-base h-32 ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'}`}
            placeholder="Dites-en plus sur l'ambiance..."
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View className="h-20" />
      </ScrollView>
    </ThemedView>
  );
}