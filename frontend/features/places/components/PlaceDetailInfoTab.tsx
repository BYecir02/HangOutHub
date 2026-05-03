import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ContactAction from '@/shared/ui/ContactAction';
import MediaFrame from '@/shared/ui/MediaFrame';
import { useI18n } from '@/shared/hooks/use-i18n';

type PlaceDetailInfoTabPlace = {
  id: string;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  openingHours?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  City?: {
    name?: string | null;
  } | null;
  Owner?: {
    id?: string;
    displayName?: string | null;
    username?: string | null;
  } | null;
};

type PlaceDetailInfoTabProps = {
  place: PlaceDetailInfoTabPlace;
  openingHoursLines: string[];
  gallery: string[];
  onOpenGallery: (index: number) => void;
  onContactPlace: () => void;
};

export default function PlaceDetailInfoTab({
  place,
  openingHoursLines,
  gallery,
  onOpenGallery,
  onContactPlace,
}: PlaceDetailInfoTabProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <View className="pb-2 pt-4">
      <View className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-800">
        <View className="flex-row items-start">
          <Ionicons name="location-outline" size={20} color="#2ecc71" />
          <View className="ml-3 flex-1">
            <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('placeDetailAddressLabel')}
            </Text>
            <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
              {place.address || t('homeAddressToConfirm')}
            </Text>
            {place.latitude !== null &&
            place.latitude !== undefined &&
            place.longitude !== null &&
            place.longitude !== undefined ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/map',
                    params: { placeId: place.id },
                  })
                }
                className="mt-3 self-start rounded-full bg-[#4c669f] px-4 py-2"
              >
                <Text className="text-xs font-semibold text-white">Voir sur la carte</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View className="mt-5 flex-row items-start">
          <Ionicons name="person-outline" size={20} color="#4c669f" />
          <View className="ml-3 flex-1">
            <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('placeDetailPublishedBy')}
            </Text>
            <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
              {place.Owner?.displayName || place.Owner?.username || t('placeDetailUnknownOrganizer')}
            </Text>
            {place.Owner?.id ? (
              <ContactAction onPress={onContactPlace} label={t('directChatContactPlace')} />
            ) : null}
          </View>
        </View>

        {place.phone || place.whatsapp || place.openingHours ? (
          <View className="mt-5">
            {place.phone ? (
              <View className="flex-row items-start">
                <Ionicons name="call-outline" size={20} color="#0ea5e9" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {t('createPlacePhoneLabel')}
                  </Text>
                  <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                    {place.phone}
                  </Text>
                </View>
              </View>
            ) : null}

            {place.whatsapp ? (
              <View className="mt-4 flex-row items-start">
                <Ionicons name="logo-whatsapp" size={20} color="#16a34a" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {t('createPlaceWhatsappLabel')}
                  </Text>
                  <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                    {place.whatsapp}
                  </Text>
                </View>
              </View>
            ) : null}

            {place.openingHours ? (
              <View className="mt-4 flex-row items-start">
                <Ionicons name="time-outline" size={20} color="#f59e0b" />
                <View className="ml-3 flex-1">
                  <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {t('createPlaceHoursLabel')}
                  </Text>
                  {openingHoursLines.length > 0 ? (
                    openingHoursLines.map((line, index) => (
                      <Text
                        key={`${place.id}-hours-${index}`}
                        className="mt-1 text-base text-gray-800 dark:text-gray-100"
                      >
                        {line}
                      </Text>
                    ))
                  ) : (
                    <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                      {place.openingHours}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View className="mt-6">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('placeDetailAbout')}
        </Text>
        <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
          {place.description || t('placeDetailDescriptionFallback')}
        </Text>
      </View>

      <View className="mt-6">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('placeDetailGallery')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
        >
          {gallery.map((image, index) => (
            <TouchableOpacity
              key={`${place.id}-gallery-${index}`}
              onPress={() => {
                onOpenGallery(index);
              }}
              className="mr-3"
              activeOpacity={0.9}
            >
              <MediaFrame
                source={image}
                className="w-40 rounded-2xl bg-gray-200 dark:bg-gray-800"
                adaptiveHeight
                minHeight={112}
                maxHeight={200}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
