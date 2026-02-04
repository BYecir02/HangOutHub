import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, useColorScheme, Image, ScrollView, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function CreatePostScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  // Gestion des images (Caméra ou Galerie)
  const pickImage = async (source: 'camera' | 'gallery') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    };

    let result;
    if (source === 'camera') {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  // Simulation d'ajout de localisation
  const toggleLocation = () => {
    if (location) setLocation(null);
    else setLocation("Le Code Bar, Cotonou"); // Mock pour l'instant
  };

  return (
    <View className="flex-1 bg-white dark:bg-black pt-14">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="close" size={28} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          disabled={!content.trim()}
          className={`px-5 py-2 rounded-full ${content.trim() ? 'bg-[#f39c12]' : 'bg-gray-200 dark:bg-gray-800'}`}
        >
          <Text className={`font-bold ${content.trim() ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
            Publier
          </Text>
        </TouchableOpacity>
      </View>

      {/* ZONE DE TEXTE + TOOLBAR */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1 pb-20"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Champ de texte */}
          <TextInput
            className="p-5 text-xl text-gray-800 dark:text-white leading-7 min-h-[150px]"
            placeholder="Quoi de neuf ?"
            placeholderTextColor={isDark ? "#666" : "#999"}
            multiline
            textAlignVertical="top"
            autoFocus
            value={content}
            onChangeText={setContent}
          />

          {/* Badge Localisation */}
          {location && (
            <View className="px-5 mb-4">
              <View className="bg-blue-50 dark:bg-blue-900/30 self-start flex-row items-center px-3 py-1.5 rounded-full">
                <Ionicons name="location" size={16} color="#4c669f" />
                <Text className="text-[#4c669f] font-bold ml-1">{location}</Text>
                <TouchableOpacity onPress={() => setLocation(null)} className="ml-2">
                  <Ionicons name="close-circle" size={16} color="#4c669f" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Zone Sondage */}
          {showPoll && (
            <View className="mx-5 p-4 border border-gray-200 dark:border-gray-800 rounded-xl mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="font-bold text-gray-500">Sondage</Text>
                <TouchableOpacity onPress={() => setShowPoll(false)}>
                  <Ionicons name="close" size={20} color="gray" />
                </TouchableOpacity>
              </View>
              <TextInput placeholder="Choix 1" className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-2 text-gray-800 dark:text-white" />
              <TextInput placeholder="Choix 2" className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-gray-800 dark:text-white" />
              <TouchableOpacity className="mt-2">
                <Text className="text-[#4c669f] font-bold text-sm">+ Ajouter une option</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Prévisualisation des images */}
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-4">
              {images.map((uri, index) => (
                <View key={index} className="mr-3 relative">
                  <Image source={{ uri }} className="w-40 h-40 rounded-xl bg-gray-100" resizeMode="cover" />
                  <TouchableOpacity 
                    onPress={() => setImages(images.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </ScrollView>

        {/* SÉLECTEUR DE VISIBILITÉ */}
        <View className="px-5 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
             <TouchableOpacity 
               onPress={() => setShowVisibilityModal(true)}
               className="flex-row items-center self-start"
             >
               <Text className="text-[#4c669f] font-bold text-sm mr-1">
                 {visibility === 'public' ? 'Tout le monde' : visibility === 'friends' ? 'Amis uniquement' : 'Moi uniquement'}
               </Text>
               <Ionicons name="chevron-down" size={14} color="#4c669f" />
             </TouchableOpacity>
        </View>

        {/* BARRE D'OUTILS */}
        <View className="flex-row items-center px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black mb-5">
            {/* Galerie */}
            <TouchableOpacity onPress={() => pickImage('gallery')} className="mr-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-full">
                <Ionicons name="image" size={24} color="#4c669f" />
            </TouchableOpacity>
            
            {/* Caméra */}
            <TouchableOpacity onPress={() => pickImage('camera')} className="mr-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-full">
                <Ionicons name="camera" size={24} color="#4c669f" />
            </TouchableOpacity>

            {/* Sondage */}
            <TouchableOpacity onPress={() => setShowPoll(!showPoll)} className={`mr-4 p-2 rounded-full ${showPoll ? 'bg-blue-100' : 'bg-gray-50 dark:bg-gray-800'}`}>
                <Ionicons name="stats-chart" size={24} color="#4c669f" />
            </TouchableOpacity>

            {/* Localisation */}
            <TouchableOpacity onPress={toggleLocation} className={`mr-4 p-2 rounded-full ${location ? 'bg-blue-100' : 'bg-gray-50 dark:bg-gray-800'}`}>
                <Ionicons name="location" size={24} color="#4c669f" />
            </TouchableOpacity>
            
            <View className="flex-1" />
            
            {/* Compteur de caractères discret */}
            <Text className="text-gray-300 dark:text-gray-600 text-xs font-medium">
              {content.length}/500
            </Text>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL DE SÉLECTION DE VISIBILITÉ */}
      <Modal
        visible={showVisibilityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setShowVisibilityModal(false)}
            className="flex-1 justify-end bg-black/50"
        >
            <TouchableOpacity activeOpacity={1} className="bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-10">
                <View className="items-center mb-4">
                    <View className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
                </View>
                <Text className="text-center text-lg font-bold text-gray-800 dark:text-white mb-6">Qui peut voir ce post ?</Text>
                
                {[
                    { id: 'public', label: 'Tout le monde', icon: 'globe-outline', desc: 'Visible par tous les utilisateurs' },
                    { id: 'friends', label: 'Amis uniquement', icon: 'people-outline', desc: 'Seuls vos abonnés peuvent voir' },
                    { id: 'private', label: 'Moi uniquement', icon: 'lock-closed-outline', desc: 'Visible uniquement par vous' },
                ].map((option) => (
                    <TouchableOpacity 
                        key={option.id}
                        onPress={() => {
                            setVisibility(option.id as any);
                            setShowVisibilityModal(false);
                        }}
                        className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800"
                    >
                        <View className={`p-3 rounded-full mr-4 ${visibility === option.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <Ionicons name={option.icon as any} size={24} color={visibility === option.id ? "#4c669f" : "gray"} />
                        </View>
                        <View className="flex-1">
                            <Text className={`font-bold text-base ${visibility === option.id ? 'text-[#4c669f]' : 'text-gray-800 dark:text-white'}`}>
                                {option.label}
                            </Text>
                            <Text className="text-gray-500 text-xs mt-0.5">{option.desc}</Text>
                        </View>
                        {visibility === option.id && (
                            <Ionicons name="checkmark-circle" size={24} color="#4c669f" />
                        )}
                    </TouchableOpacity>
                ))}
                
                <View className="h-4" />
            </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}