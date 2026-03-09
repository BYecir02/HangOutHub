import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import api from '../services/api';

interface PlaceOption {
  id: string;
  name: string;
  address?: string | null;
  City?: {
    id: number;
    name: string;
  } | null;
}

function getInitialScheduledDate(rawValue?: string) {
  if (!rawValue) {
    return new Date(Date.now() + 2 * 60 * 60 * 1000);
  }

  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime())
    ? new Date(Date.now() + 2 * 60 * 60 * 1000)
    : parsedDate;
}

export default function CreateOutingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    placeId?: string;
    scheduledDate?: string;
    sourceLabel?: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>(() =>
    getInitialScheduledDate(
      typeof params.scheduledDate === 'string' ? params.scheduledDate : undefined,
    ),
  );
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    if (typeof params.title === 'string' && params.title.trim()) {
      setTitle(params.title);
    }

    if (typeof params.scheduledDate === 'string') {
      setScheduledDate(getInitialScheduledDate(params.scheduledDate));
    }
  }, [params.scheduledDate, params.title]);

  useEffect(() => {
    let isMounted = true;

    const fetchPlaces = async () => {
      try {
        const response = await api.get<PlaceOption[]>('/places');
        if (isMounted) {
          setPlaces(response.data);
          const preselectedPlaceId =
            typeof params.placeId === 'string' &&
            response.data.some((place) => place.id === params.placeId)
              ? params.placeId
              : null;

          setSelectedPlaceId(preselectedPlaceId || response.data[0]?.id || null);
        }
      } catch {
        if (isMounted) {
          setPlaces([]);
          setSelectedPlaceId(null);
        }
      } finally {
        if (isMounted) {
          setPlacesLoading(false);
        }
      }
    };

    void fetchPlaces();

    return () => {
      isMounted = false;
    };
  }, [params.placeId]);

  const onDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (!selectedDate) {
      return;
    }

    setScheduledDate(selectedDate);
  };

  const handleCreateOuting = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre de la sortie est obligatoire.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/outings', {
        title: title.trim(),
        scheduledDate: scheduledDate.toISOString(),
        placeId: selectedPlaceId || undefined,
      });

      Alert.alert('Succes', 'Sortie creee.');
      router.replace('/(tabs)/profile');
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de creer la sortie.');
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
          Organiser une sortie
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-5" showsVerticalScrollIndicator={false}>
        <View className="rounded-3xl bg-[#4c669f]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4c669f]">
            Sortie
          </Text>
          {typeof params.sourceLabel === 'string' && params.sourceLabel ? (
            <Text className="mt-3 text-sm font-semibold text-[#4c669f]">
              Depuis {params.sourceLabel}
            </Text>
          ) : null}
          <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            Planifie un rendez-vous simple et rapide
          </Text>
          <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
            Choisis un lieu, fixe une date et garde une trace propre dans ton profil.
          </Text>
        </View>

        <View className="mt-6 gap-4">
          <TextInput
            placeholder="Titre de la sortie"
            placeholderTextColor={isDark ? '#666' : '#999'}
            className="rounded-2xl bg-gray-50 p-4 text-lg font-semibold text-gray-800 dark:bg-gray-800 dark:text-white"
            value={title}
            onChangeText={setTitle}
          />

          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Date et heure
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setPickerMode('date');
                  setShowPicker(true);
                }}
                className="flex-1 items-center rounded-xl bg-white p-3 dark:bg-gray-800"
              >
                <Text className="text-gray-800 dark:text-white">
                  {scheduledDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPickerMode('time');
                  setShowPicker(true);
                }}
                className="flex-1 items-center rounded-xl bg-white p-3 dark:bg-gray-800"
              >
                <Text className="text-gray-800 dark:text-white">
                  {scheduledDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Lieu conseille
            </Text>

            {placesLoading ? (
              <ActivityIndicator color="#4c669f" />
            ) : places.length > 0 ? (
              places.slice(0, 6).map((place) => (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => setSelectedPlaceId(place.id)}
                  className={`mb-3 rounded-2xl border p-4 ${
                    selectedPlaceId === place.id
                      ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">
                    {place.name}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {place.City?.name || place.address || 'Adresse a confirmer'}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Aucun lieu disponible. Tu peux tout de meme creer une sortie libre sans lieu rattache.
              </Text>
            )}

            <TouchableOpacity
              onPress={() => setSelectedPlaceId(null)}
              className={`mt-2 self-start rounded-full px-4 py-2 ${
                selectedPlaceId === null
                  ? 'bg-[#4c669f]'
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <Text
                className={`font-semibold ${
                  selectedPlaceId === null
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                Sortie libre
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCreateOuting}
          disabled={loading}
          className="mb-10 mt-8 items-center rounded-2xl bg-[#4c669f] py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-bold text-white">
              Creer ma sortie
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
                  value={scheduledDate}
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
            value={scheduledDate}
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
