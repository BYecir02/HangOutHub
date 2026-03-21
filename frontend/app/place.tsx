import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api from '../services/api';
import { patchStoredUserSession } from '@/services/user-session';

export default function CreatePlaceScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [priceLevel, setPriceLevel] = useState(1);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 10,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImages((current) => [...current, ...result.assets]);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('createPlacePermissionDeniedTitle'),
          t('createPlacePermissionDeniedMessage'),
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0 && !address.trim()) {
        const addr = reverseGeocode[0];
        const formattedAddress = `${addr.street || ''} ${addr.name || ''}, ${
          addr.city || ''
        }`.trim();
        setAddress(formattedAddress);
      }
    } catch {
      Alert.alert(t('commonErrorTitle'), t('createPlaceGpsError'));
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim() || !coords) {
      Alert.alert(
        t('createPlaceMissingRequiredTitle'),
        t('createPlaceMissingRequiredMessage'),
      );
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('address', address.trim());
      formData.append('latitude', String(coords.lat));
      formData.append('longitude', String(coords.lng));
      formData.append('priceLevel', String(priceLevel));
      formData.append('cityId', '1');

      if (images.length > 0) {
        const coverImage = images[coverIndex];
        formData.append('cover', {
          uri: coverImage.uri,
          name: coverImage.fileName || 'place-cover.jpg',
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

      const response = await api.post('/places', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await patchStoredUserSession({ hasPlace: true });

      Alert.alert(t('createPlaceSuccessTitle'), t('createPlaceSuccessMessage'));
      router.replace({
        pathname: '/place/[id]',
        params: { id: response.data.id },
      });
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('createPlaceCreateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white pt-14 dark:bg-black">
      <View className="z-10 flex-row items-center border-b border-gray-100 bg-white px-5 pb-4 dark:border-gray-800 dark:bg-black">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
        >
          <Ionicons name="close" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-gray-800 dark:text-white">
          {t('createPlaceTitle')}
        </Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#2ecc71" />
          ) : (
            <Text className="text-lg font-bold text-[#2ecc71]">{t('createPlacePublish')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <TouchableOpacity
            onPress={pickImage}
            className="relative h-56 w-full items-center justify-center bg-gray-100 dark:bg-gray-900"
          >
            {images.length > 0 ? (
              <>
                <Image
                  source={{ uri: images[coverIndex].uri }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                <View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1">
                  <Text className="text-xs font-bold text-white">{t('createPlaceCover')}</Text>
                </View>
              </>
            ) : (
              <View className="items-center">
                <View className="mb-2 rounded-full bg-gray-200 p-4">
                  <Ionicons name="images" size={32} color="#999" />
                </View>
                <Text className="font-medium text-gray-400">
                  {t('createPlaceAddPhotos')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3 px-5"
            >
              {images.map((img, index) => (
                <TouchableOpacity
                  key={`${img.uri}-${index}`}
                  onPress={() => setCoverIndex(index)}
                  className={`mr-3 h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    index === coverIndex
                      ? 'border-[#2ecc71]'
                      : 'border-transparent'
                  }`}
                >
                  <Image source={{ uri: img.uri }} className="h-full w-full" />
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

        <View className="space-y-5 px-5 pb-10">
          <View>
            <Text className="mb-2 ml-1 font-medium text-gray-500 dark:text-gray-400">
              {t('createPlaceNameLabel')} <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('createPlaceNamePlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-lg font-bold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </View>

          <View className="pt-3">
            <Text className="mb-2 ml-1 font-medium text-gray-500 dark:text-gray-400">
              {t('createPlaceDescriptionLabel')}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('createPlaceDescriptionPlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="h-32 rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </View>

          <View className="pt-3">
            <Text className="mb-3 ml-1 font-medium text-gray-500 dark:text-gray-400">
              {t('createPlacePriceLevelLabel')}
            </Text>
            <View className="flex-row gap-3">
              {[1, 2, 3, 4].map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setPriceLevel(level)}
                  className={`flex-1 items-center rounded-xl border py-3 ${
                    priceLevel === level
                      ? 'border-[#2ecc71] bg-[#2ecc71]'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-lg font-bold ${
                      priceLevel === level ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    {Array(level).fill('$').join('')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="my-2 h-[1px] bg-gray-100 dark:bg-gray-800" />

          <View className="pt-3">
            <Text className="mb-3 ml-1 font-medium text-gray-500 dark:text-gray-400">
              {t('createPlaceLocationLabel')} <Text className="text-red-500">*</Text>
            </Text>

            <TouchableOpacity
              onPress={getCurrentLocation}
              className={`mb-4 flex-row items-center justify-center rounded-xl border border-dashed p-4 ${
                coords
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
              }`}
            >
              {locationLoading ? (
                <ActivityIndicator color="#4c669f" />
              ) : (
                <>
                  <Ionicons
                    name={coords ? 'checkmark-circle' : 'navigate'}
                    size={20}
                    color={coords ? '#2ecc71' : '#4c669f'}
                  />
                  <Text
                    className={`ml-2 font-bold ${
                      coords ? 'text-green-700' : 'text-blue-700'
                    }`}
                  >
                    {coords
                      ? t('createPlaceGpsDetected')
                      : t('createPlaceUseCurrentPosition')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder={t('createPlaceAddressPlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />

            {coords ? (
              <Text className="mt-2 text-center text-xs text-gray-400">
                Lat: {coords.lat.toFixed(5)} | Lng: {coords.lng.toFixed(5)}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
