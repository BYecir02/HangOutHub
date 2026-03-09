import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import api from '../services/api';

interface OwnedPlaceOption {
  id: string;
  name: string;
  address?: string | null;
}

export default function CreateEventScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [ownedPlaces, setOwnedPlaces] = useState<OwnedPlaceOption[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    price: '',
  });
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [currentField, setCurrentField] = useState<'start' | 'end'>('start');
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchOwnedPlaces = async () => {
      try {
        const response = await api.get('/users/me');
        const places = response.data?.OwnedPlaces || [];
        if (isMounted) {
          setOwnedPlaces(places);
          setSelectedPlaceId(places[0]?.id || null);
        }
      } catch {
        if (isMounted) {
          setOwnedPlaces([]);
          setSelectedPlaceId(null);
        }
      } finally {
        if (isMounted) {
          setPlacesLoading(false);
        }
      }
    };

    void fetchOwnedPlaces();

    return () => {
      isMounted = false;
    };
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 5,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages((current) => [...current, ...result.assets]);
    }
  };

  const showDatepicker = (field: 'start' | 'end', mode: 'date' | 'time') => {
    setCurrentField(field);
    setPickerMode(mode);
    setShowPicker(true);
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (!selectedDate) {
      return;
    }

    if (currentField === 'start') {
      setEventForm((prev) => ({ ...prev, startTime: selectedDate }));
      if (selectedDate > eventForm.endTime) {
        setEventForm((prev) => ({ ...prev, endTime: selectedDate }));
      }
      return;
    }

    setEventForm((prev) => ({ ...prev, endTime: selectedDate }));
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire.');
      return;
    }

    if (eventForm.endTime < eventForm.startTime) {
      Alert.alert('Erreur', 'La date de fin doit etre apres le debut.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', eventForm.title.trim());
      formData.append('description', eventForm.description.trim());
      formData.append('startTime', eventForm.startTime.toISOString());
      formData.append('endTime', eventForm.endTime.toISOString());
      formData.append('entryFee', eventForm.price || '0');

      if (selectedPlaceId) {
        formData.append('placeId', selectedPlaceId);
      }

      if (images.length > 0) {
        const coverImage = images[coverIndex];
        formData.append('cover', {
          uri: coverImage.uri,
          name: coverImage.fileName || 'event-cover.jpg',
          type: coverImage.mimeType || 'image/jpeg',
        } as any);

        images.forEach((img, index) => {
          if (index !== coverIndex) {
            formData.append('gallery', {
              uri: img.uri,
              name: img.fileName || `gallery-${index}.jpg`,
              type: img.mimeType || 'image/jpeg',
            } as any);
          }
        });
      }

      const response = await api.post('/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Succes', 'Evenement publie.');
      router.replace({
        pathname: '/event/[id]',
        params: { id: response.data.id },
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', "Impossible de creer l'evenement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white pt-14 dark:bg-black">
      <View className="flex-row items-center border-b border-gray-100 px-5 pb-4 dark:border-gray-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
        >
          <Ionicons name="close" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-gray-800 dark:text-white">
          Publier un evenement
        </Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <TouchableOpacity
            onPress={pickImage}
            className="relative h-48 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
          >
            {images.length > 0 ? (
              <>
                <Image
                  source={{ uri: images[coverIndex].uri }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                <View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1">
                  <Text className="text-xs font-bold text-white">Couverture</Text>
                </View>
              </>
            ) : (
              <View className="items-center">
                <Ionicons name="images-outline" size={40} color="#999" />
                <Text className="mt-2 font-medium text-gray-400">
                  Ajouter des photos
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              {images.map((img, index) => (
                <TouchableOpacity
                  key={`${img.uri}-${index}`}
                  onPress={() => setCoverIndex(index)}
                  className={`mr-3 h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    index === coverIndex ? 'border-[#ff4757]' : 'border-transparent'
                  }`}
                >
                  <Image source={{ uri: img.uri }} className="h-16 w-16" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={pickImage}
                className="h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
              >
                <Ionicons name="add" size={24} color="#999" />
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>

        <View className="gap-4">
          <TextInput
            placeholder="Titre"
            placeholderTextColor={isDark ? '#666' : '#999'}
            className="rounded-xl bg-gray-50 p-4 text-lg text-gray-800 dark:bg-gray-800 dark:text-white"
            value={eventForm.title}
            onChangeText={(title) => setEventForm((prev) => ({ ...prev, title }))}
          />

          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Lieu rattache
            </Text>
            {placesLoading ? (
              <ActivityIndicator color="#4c669f" />
            ) : ownedPlaces.length > 0 ? (
              ownedPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => setSelectedPlaceId(place.id)}
                  className={`mb-3 rounded-2xl border p-4 ${
                    selectedPlaceId === place.id
                      ? 'border-[#ff4757] bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">
                    {place.name}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {place.address || 'Adresse a confirmer'}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Aucun lieu rattache. Tu peux quand meme publier un evenement, ou
                  creer un lieu avant.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/place')}
                  className="mt-3 self-start rounded-xl bg-[#2ecc71] px-4 py-3"
                >
                  <Text className="font-semibold text-white">Creer un lieu</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1 gap-2">
              <Text className="ml-1 font-medium text-gray-500 dark:text-gray-400">
                Debut
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => showDatepicker('start', 'date')}
                  className="flex-1 items-center rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.startTime.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => showDatepicker('start', 'time')}
                  className="flex-1 items-center rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.startTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1 gap-2">
              <Text className="ml-1 font-medium text-gray-500 dark:text-gray-400">
                Fin
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => showDatepicker('end', 'date')}
                  className="flex-1 items-center rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.endTime.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => showDatepicker('end', 'time')}
                  className="flex-1 items-center rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.endTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TextInput
            placeholder="Prix (0 = Gratuit)"
            placeholderTextColor={isDark ? '#666' : '#999'}
            keyboardType="numeric"
            className="rounded-xl bg-gray-50 p-4 text-gray-800 dark:bg-gray-800 dark:text-white"
            value={eventForm.price}
            onChangeText={(price) => setEventForm((prev) => ({ ...prev, price }))}
          />
          <TextInput
            placeholder="Description..."
            placeholderTextColor={isDark ? '#666' : '#999'}
            multiline
            className="h-32 rounded-xl bg-gray-50 p-4 text-gray-800 dark:bg-gray-800 dark:text-white"
            textAlignVertical="top"
            value={eventForm.description}
            onChangeText={(description) =>
              setEventForm((prev) => ({ ...prev, description }))
            }
          />
        </View>

        <TouchableOpacity
          onPress={handleCreateEvent}
          disabled={loading}
          className="mb-10 mt-8 items-center rounded-xl bg-[#ff4757] py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-bold text-white">
              Publier maintenant
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {showPicker ? (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={showPicker}>
            <View className="flex-1 justify-end bg-black/50">
              <View className="overflow-hidden rounded-t-3xl bg-white pb-8 dark:bg-gray-900">
                <View className="flex-row items-center justify-between border-b border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text className="font-medium text-gray-500">Annuler</Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-gray-800 dark:text-white">
                    {pickerMode === 'date' ? 'Choisir une date' : 'Choisir une heure'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text className="text-lg font-bold text-[#4c669f]">OK</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={
                    currentField === 'start'
                      ? eventForm.startTime
                      : eventForm.endTime
                  }
                  mode={pickerMode}
                  is24Hour
                  display="spinner"
                  onChange={onDateChange}
                  style={{
                    height: 200,
                    width: '100%',
                    backgroundColor: isDark ? '#111827' : 'white',
                  }}
                  textColor={isDark ? 'white' : 'black'}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={
              currentField === 'start' ? eventForm.startTime : eventForm.endTime
            }
            mode={pickerMode}
            is24Hour
            display="default"
            onChange={onDateChange}
          />
        )
      ) : null}
    </View>
  );
}
