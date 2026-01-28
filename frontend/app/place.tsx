import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../services/api';

export default function CreatePlaceScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // --- ÉTATS DU FORMULAIRE ---
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [priceLevel, setPriceLevel] = useState(1); 

  // 1. CHOISIR UNE IMAGE
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      aspect: [16, 9], // Format paysage pour un lieu
      quality: 0.7,
    });

    if (!result.canceled) {
      // On ajoute les nouvelles images à la suite
      setImages([...images, ...result.assets]);
    }
  };

  // 2. OBTENIR LA POSITION GPS ACTUELLE
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de la localisation pour placer le lieu sur la carte.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });
      
      // Petit bonus : On essaie de deviner l'adresse texte (Reverse Geocoding)
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const formattedAddress = `${addr.street || ''} ${addr.name || ''}, ${addr.city}`;
        if (!address) setAddress(formattedAddress); // On remplit seulement si vide
      }

    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer la position GPS.');
    } finally {
      setLocationLoading(false);
    }
  };

  // 3. ENVOYER AU BACKEND
  const handleSubmit = async () => {
    if (!name || !address || !coords) {
      Alert.alert("Oups", "Le nom, l'adresse et la localisation GPS sont obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('address', address);
      formData.append('latitude', String(coords.lat));
      formData.append('longitude', String(coords.lng));
      formData.append('priceLevel', String(priceLevel));
      formData.append('cityId', '1'); // Valeur par défaut (Cotonou)

      if (images.length > 0) {
        // 1. Image de couverture
        const coverImage = images[coverIndex];
        formData.append('cover', {
          uri: coverImage.uri,
          name: 'place_cover.jpg',
          type: 'image/jpeg',
        } as any);

        // 2. Galerie (les autres images)
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

      // Envoi vers POST /places
      await api.post('/places', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert("Succès ! 📍", "Le lieu a été ajouté.");
      router.back(); // Retour au menu
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de créer le lieu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-black pt-14">
      {/* HEADER */}
      <View className="flex-row items-center px-5 pb-4 border-b border-gray-100 dark:border-gray-800 z-10 bg-white dark:bg-black">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-full">
          <Ionicons name="close" size={24} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800 flex-1">Ajouter un Lieu</Text>
        
        {/* Bouton Publier en haut à droite */}
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#2ecc71" />
          ) : (
            <Text className="text-[#2ecc71] font-bold text-lg">Publier</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* 1. SECTION IMAGE */}
        <View className="mb-6">
          <TouchableOpacity onPress={pickImage} className="w-full h-56 bg-gray-100 dark:bg-gray-900 justify-center items-center relative">
            {images.length > 0 ? (
              <>
                <Image source={{ uri: images[coverIndex].uri }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute bottom-2 right-2 bg-black/60 px-3 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">Couverture</Text>
                </View>
              </>
            ) : (
              <View className="items-center">
                <View className="bg-gray-200 p-4 rounded-full mb-2">
                  <Ionicons name="images" size={32} color="#999" />
                </View>
                <Text className="text-gray-400 font-medium">Ajouter des photos</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Liste des miniatures (Galerie) */}
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 px-5">
              {images.map((img, index) => (
                <TouchableOpacity key={index} onPress={() => setCoverIndex(index)} className={`mr-3 rounded-lg overflow-hidden border-2 w-16 h-16 ${index === coverIndex ? 'border-[#2ecc71]' : 'border-transparent dark:border-transparent'}`}>
                  <Image source={{ uri: img.uri }} className="w-full h-full" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={pickImage} className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-lg justify-center items-center border border-gray-200 dark:border-gray-700">
                <Ionicons name="add" size={24} color="#999" />
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        <View className="px-5 space-y-5 pb-10">
          
          {/* 2. NOM DU LIEU */}
          <View>
            <Text className="text-gray-500 dark:text-gray-400 font-medium mb-2 ml-1">Nom du lieu <Text className="text-red-500">*</Text></Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Le Code Bar"
              placeholderTextColor={isDark ? "#666" : "#999"}
              className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-gray-800 dark:text-white font-bold text-lg border border-gray-200 dark:border-gray-700"
            />
          </View>

          {/* 3. DESCRIPTION */}
          <View className='pt-3'>
            <Text className="text-gray-500 dark:text-gray-400 font-medium mb-2 ml-1">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ambiance, spécialités, horaires..."
              placeholderTextColor={isDark ? "#666" : "#999"}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 h-32"
            />
          </View>

          {/* 4. NIVEAU DE PRIX */}
          <View className='pt-3'>
            <Text className="text-gray-500 dark:text-gray-400 font-medium mb-3 ml-1">Niveau de prix</Text>
            <View className="flex-row gap-3">
              {[1, 2, 3, 4].map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setPriceLevel(level)}
                  className={`flex-1 py-3 rounded-xl items-center border ${
                    priceLevel === level 
                      ? 'bg-[#2ecc71] border-[#2ecc71]' 
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Text className={`font-bold text-lg ${priceLevel === level ? 'text-white' : 'text-gray-400'}`}>
                    {Array(level).fill('$').join('')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="h-[1px] bg-gray-100 dark:bg-gray-800 my-2" />

          {/* 5. LOCALISATION (GPS + ADRESSE) */}
          <View className='pt-3'>
            <Text className="text-gray-500 dark:text-gray-400 font-medium mb-3 ml-1">Localisation <Text className="text-red-500">*</Text></Text>
            
            {/* Bouton GPS */}
            <TouchableOpacity 
              onPress={getCurrentLocation}
              className={`flex-row items-center justify-center p-4 rounded-xl border border-dashed mb-4 ${coords ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}
            >
              {locationLoading ? (
                <ActivityIndicator color="#4c669f" />
              ) : (
                <>
                  <Ionicons name={coords ? "checkmark-circle" : "navigate"} size={20} color={coords ? "#2ecc71" : "#4c669f"} />
                  <Text className={`font-bold ml-2 ${coords ? 'text-green-700' : 'text-blue-700'}`}>
                    {coords ? "Position GPS détectée" : "Utiliser ma position actuelle"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Champ Adresse Texte */}
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Adresse (ex: Haie Vive, Rue 120)"
              placeholderTextColor={isDark ? "#666" : "#999"}
              className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700"
            />
            
            {/* Affichage discret des coordonnées pour debug */}
            {coords && (
              <Text className="text-xs text-gray-400 mt-2 text-center">
                Lat: {coords.lat.toFixed(5)} | Lng: {coords.lng.toFixed(5)}
              </Text>
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}