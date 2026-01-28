import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, Alert, Platform, Modal, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';

export default function CreateEventScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  
  // On utilise des objets Date pour gérer facilement le temps
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000), // +1h par défaut
    price: '',
  });
  
  // États pour le sélecteur de date
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [currentField, setCurrentField] = useState<'start' | 'end'>('start');

  // Gestion des images multiples
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coverIndex, setCoverIndex] = useState(0); // L'index 0 est la couverture par défaut

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // ✅ Autoriser plusieurs images
      selectionLimit: 5, // Limite à 5 par exemple
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      // On ajoute les nouvelles images à la suite
      setImages([...images, ...result.assets]);
    }
  };

  // Fonction pour ouvrir le sélecteur
  const showDatepicker = (field: 'start' | 'end', mode: 'date' | 'time') => {
    setCurrentField(field);
    setPickerMode(mode);
    setShowPicker(true);
  };

  // Fonction appelée quand une date est choisie
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate) {
      if (currentField === 'start') {
        setEventForm(prev => ({ ...prev, startTime: selectedDate }));
      } else {
        setEventForm(prev => ({ ...prev, endTime: selectedDate }));
      }
    }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title) {
      Alert.alert("Erreur", "Le titre est obligatoire.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', eventForm.title);
      formData.append('description', eventForm.description);
      // Envoi des dates au format ISO (compatible Prisma)
      formData.append('startTime', eventForm.startTime.toISOString());
      formData.append('endTime', eventForm.endTime.toISOString());
      formData.append('entryFee', eventForm.price || '0');

      // Gestion des images
      if (images.length > 0) {
        // 1. L'image choisie comme couverture
        const coverImage = images[coverIndex];
        formData.append('cover', {
          uri: coverImage.uri,
          name: 'cover.jpg',
          type: 'image/jpeg',
        } as any);

        // 2. Les autres images (Galerie)
        images.forEach((img, index) => {
          if (index !== coverIndex) {
            formData.append('gallery', {
              uri: img.uri,
              name: `gallery_${index}.jpg`,
              type: 'image/jpeg',
            } as any);
          }
        });
      }

      await api.post('/events', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      Alert.alert("Succès", "Événement publié ! 🎉");
      router.dismissAll(); // Ferme tout et revient à l'accueil
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de créer l'événement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-black pt-14">
      <View className="flex-row items-center px-5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-full">
          <Ionicons name="close" size={24} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800 dark:text-white flex-1">Publier un Événement </Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {/* SECTION IMAGES */}
        <View className="mb-6">
          {/* Image Principale (Cover) */}
          <TouchableOpacity onPress={pickImage} className="h-48 bg-gray-100 dark:bg-gray-900 rounded-xl justify-center items-center border border-gray-200 dark:border-gray-700 border-dashed overflow-hidden relative">
            {images.length > 0 ? (
              <>
                <Image source={{ uri: images[coverIndex].uri }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute bottom-2 right-2 bg-black/60 px-3 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">Couverture</Text>
                </View>
              </>
            ) : (
              <View className="items-center">
                <Ionicons name="images-outline" size={40} color="#999" />
                <Text className="text-gray-400 mt-2 font-medium">Ajouter des photos</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Liste des miniatures (Galerie) */}
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              {images.map((img, index) => (
                <TouchableOpacity key={index} onPress={() => setCoverIndex(index)} className={`mr-3 rounded-lg overflow-hidden border-2 w-16 h-16 ${index === coverIndex ? 'border-[#ff4757]' : 'border-transparent'}`}>
                  <Image source={{ uri: img.uri }} className="w-16 h-16" />
                </TouchableOpacity>
              ))}
              {/* Bouton + pour ajouter d'autres */}
              <TouchableOpacity onPress={pickImage} className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-lg justify-center items-center border border-gray-200 dark:border-gray-700">
                <Ionicons name="add" size={24} color="#999" />
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        <View className="gap-4">
          <TextInput placeholder="Titre" placeholderTextColor={isDark ? "#666" : "#999"} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-lg text-gray-800 dark:text-white" value={eventForm.title} onChangeText={(t) => setEventForm({...eventForm, title: t})} />
          
          {/* SÉLECTEURS DE DATE/HEURE */}
          <View className="flex-row gap-4">
            <View className="flex-1 gap-2">
              <Text className="text-gray-500 dark:text-gray-400 font-medium ml-1">Début</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => showDatepicker('start', 'date')} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex-1 items-center">
                  <Text className="text-gray-800 dark:text-white">{eventForm.startTime.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => showDatepicker('start', 'time')} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex-1 items-center">
                  <Text className="text-gray-800 dark:text-white">{eventForm.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1 gap-2">
              <Text className="text-gray-500 dark:text-gray-400 font-medium ml-1">Fin</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={() => showDatepicker('end', 'date')} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex-1 items-center">
                  <Text className="text-gray-800 dark:text-white">{eventForm.endTime.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => showDatepicker('end', 'time')} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl flex-1 items-center">
                  <Text className="text-gray-800 dark:text-white">{eventForm.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TextInput placeholder="Prix (0 = Gratuit)" placeholderTextColor={isDark ? "#666" : "#999"} keyboardType="numeric" className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-gray-800 dark:text-white" value={eventForm.price} onChangeText={(t) => setEventForm({...eventForm, price: t})} />
          <TextInput placeholder="Description..." placeholderTextColor={isDark ? "#666" : "#999"} multiline className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl h-32 text-gray-800 dark:text-white" textAlignVertical="top" value={eventForm.description} onChangeText={(t) => setEventForm({...eventForm, description: t})} />
        </View>

        <TouchableOpacity onPress={handleCreateEvent} disabled={loading} className="bg-[#ff4757] py-4 rounded-xl items-center mt-8 mb-10 shadow-md shadow-red-200">
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Publier maintenant</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* COMPOSANT DATETIMEPICKER (Invisible sauf quand actif sur Android, Modal sur iOS) */}
      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent={true} animationType="slide" visible={showPicker}>
            <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white dark:bg-gray-900 pb-8 rounded-t-3xl overflow-hidden">
                <View className="flex-row justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text className="text-gray-500 font-medium">Annuler</Text>
                  </TouchableOpacity>
                  <Text className="font-bold text-gray-800 text-lg">
                    {pickerMode === 'date' ? 'Choisir une date' : 'Choisir une heure'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text className="text-[#4c669f] font-bold text-lg">OK</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={currentField === 'start' ? eventForm.startTime : eventForm.endTime}
                  mode={pickerMode}
                  is24Hour={true}
                  display="spinner"
                  onChange={onDateChange}
                  style={{ height: 200, width: '100%', backgroundColor: isDark ? '#111827' : 'white' }}
                  textColor={isDark ? "white" : "black"}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={currentField === 'start' ? eventForm.startTime : eventForm.endTime}
            mode={pickerMode}
            is24Hour={true}
            display="default"
            onChange={onDateChange}
          />
        )
      )}
    </View>
  );
}