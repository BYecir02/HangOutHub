import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import FormImagePicker from '@/shared/ui/forms/FormImagePicker';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import SearchBar from '@/shared/ui/SearchBar';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useOrganizerGuard } from '@/features/organizer/hooks/useOrganizerGuard';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import api, { clearAuthState, getApiErrorMessage, getImageUrl } from '@/services/api';
import { submitPlaceClaim, type PlaceClaimPlace } from '@/services/places/place-claims';
import { trackUserFlowEvent } from '@/services/shared/user-flow-analytics';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

type PlaceSelectionItem = PlaceClaimPlace & {
  address?: string | null;
};

function formatPlaceLocation(place: PlaceSelectionItem) {
  return [place.City?.name, place.City?.country, place.address]
    .filter(Boolean)
    .join(' - ');
}

export default function OrganizerClaimPlaceScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ placeId?: string }>();
  const {
    user,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile();
  const isAllowed = useOrganizerGuard({
    user,
    loading: profileLoading,
    suspend: Boolean(profileError),
    requiredCapability: 'places',
  });

  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceSelectionItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [proofs, setProofs] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadPlaces = async () => {
      setPlacesLoading(true);
      setPlacesError(null);

      try {
        const response = await api.get<PlaceSelectionItem[]>('/places');
        if (!mounted) {
          return;
        }

        const claimable = (response.data || [])
          .filter((place) => !place.ownerId)
          .filter((place) => {
            const normalizedStatus = (place.moderationStatus || 'APPROVED')
              .toUpperCase()
              .trim();
            return normalizedStatus === 'APPROVED';
          });

        setPlaces(claimable);
      } catch (error) {
        if (!mounted) {
          return;
        }

        const status =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          typeof (error as { response?: { status?: number } }).response?.status === 'number'
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

        if (status === 401) {
          await clearAuthState();
          router.replace('/');
          return;
        }

        setPlaces([]);
        setPlacesError(getApiErrorMessage(error, t('organizerPlaceClaimLoadFailed')));
      } finally {
        if (mounted) {
          setPlacesLoading(false);
        }
      }
    };

    void loadPlaces();

    return () => {
      mounted = false;
    };
  }, [reloadToken, router, t]);

  useEffect(() => {
    if (!params.placeId || places.length === 0) {
      return;
    }

    const nextSelected = places.find((place) => place.id === params.placeId);
    if (nextSelected) {
      setSelectedPlaceId(nextSelected.id);
    }
  }, [params.placeId, places]);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return places
      .filter((place) => {
        if (!normalizedQuery) {
          return true;
        }

        const searchable = [place.name, place.City?.name, place.address]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchable.includes(normalizedQuery);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [places, query]);

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) || null,
    [places, selectedPlaceId],
  );

  const handlePickProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    setProofs([result.assets[0]]);

    void trackUserFlowEvent({
      eventName: 'claim_place_proof_selected',
      screenPath: '/organizer/claim-place',
      metadata: {
        proofCount: 1,
        placeId: selectedPlace?.id || null,
      },
    });
  };

  const handleSubmit = async () => {
    if (!selectedPlace) {
      Alert.alert(t('commonErrorTitle'), t('organizerPlaceClaimSelectRequired'));
      return;
    }

    if (proofs.length === 0) {
      Alert.alert(t('commonErrorTitle'), t('organizerPlaceClaimProofRequired'));
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      void trackUserFlowEvent({
        eventName: 'claim_place_submit_attempted',
        screenPath: '/organizer/claim-place',
        metadata: {
          placeId: selectedPlace.id,
        },
      });

      await submitPlaceClaim(selectedPlace.id, proofs[0]);

      void trackUserFlowEvent({
        eventName: 'claim_place_submitted',
        screenPath: '/organizer/claim-place',
        metadata: {
          placeId: selectedPlace.id,
        },
      });

      Alert.alert(
        t('organizerPlaceClaimSuccessTitle'),
        t('organizerPlaceClaimSuccessMessage'),
      );
      router.replace('/organizer/place-onboarding');
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('organizerPlaceClaimSubmitFailed')),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (profileError && !user) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('organizerDataLoadErrorTitle')}
        description={t('organizerDataLoadErrorMessage')}
        actionLabel={t('organizerDataRetry')}
        onAction={() => {
          void refetchProfile();
        }}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (!user || !isAllowed) {
    return (
      <ScreenState
        mode="warning"
        fullScreen
        title={t('organizerPlaceClaimAccessTitle')}
        description={t('organizerPlaceClaimAccessDescription')}
        actionLabel={t('organizerPlaceClaimAccessAction')}
        onAction={() => router.replace('/activate-pro')}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView
        className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <ScreenHeader
          title={t('organizerPlaceClaimTitle')}
          subtitle={t('organizerPlaceClaimSubtitle')}
          label={t('organizerPlaceClaimLabel')}
          onBack={() => router.back()}
        />

        <View className="mt-6 rounded-[28px] bg-[#4c669f]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4c669f]">
            {t('organizerPlaceClaimIntroLabel')}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {t('organizerPlaceClaimIntroDescription')}
          </Text>
        </View>

        <View className="mt-6">
          <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {t('organizerPlaceClaimSearchLabel')}
          </Text>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={t('organizerPlaceClaimSearchPlaceholder')}
          />
        </View>

        {placesError ? (
          <ScreenState
            mode="error"
            title={placesError}
            actionLabel={t('organizerDataRetry')}
            onAction={() => {
              setQuery('');
              setSelectedPlaceId('');
              setProofs([]);
              setReloadToken((current) => current + 1);
            }}
            containerClassName="px-0 py-4"
          />
        ) : placesLoading ? (
          <ScreenState
            mode="loading"
            title={t('organizerPlaceClaimLoadingPlaces')}
            containerClassName="px-0 py-4"
          />
        ) : filteredPlaces.length > 0 ? (
          <View className="mt-5 gap-3">
            {filteredPlaces.map((place) => {
              const selected = place.id === selectedPlaceId;

              return (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => {
                    setSelectedPlaceId(place.id);
                    void trackUserFlowEvent({
                      eventName: 'claim_place_place_selected',
                      screenPath: '/organizer/claim-place',
                      metadata: {
                        placeId: place.id,
                      },
                    });
                  }}
                  className={`overflow-hidden rounded-[26px] border p-3 ${
                    selected
                      ? 'border-[#4c669f] bg-[#4c669f]/10'
                      : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'
                  }`}
                >
                  <View className="flex-row">
                    <Image
                      source={{ uri: getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER }}
                      className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                    />
                    <View className="ml-4 flex-1 justify-center">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">
                        {place.name}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {formatPlaceLocation(place) || t('homeAddressToConfirm')}
                      </Text>
                    </View>
                    <View className="justify-center">
                      <View
                        className={`rounded-full px-3 py-1.5 ${
                          selected ? 'bg-[#4c669f]' : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                            selected
                              ? 'text-white'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {selected
                            ? t('organizerPlaceClaimSelectedBadge')
                            : t('organizerPlaceClaimSelectBadge')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <ScreenState
            mode="empty"
            icon="search-outline"
            title={t('organizerPlaceClaimEmptyTitle')}
            description={t('organizerPlaceClaimEmptyDescription')}
            containerClassName="px-0 py-4"
          />
        )}

        {selectedPlace ? (
          <View className="mt-6 rounded-[28px] bg-white p-4 dark:bg-gray-900">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              {t('organizerPlaceClaimSelectedTitle')}
            </Text>
            <Text className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
              {selectedPlace.name}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatPlaceLocation(selectedPlace) || t('homeAddressToConfirm')}
            </Text>

            <FormImagePicker
              containerClassName="mt-4"
              images={proofs}
              coverIndex={0}
              onSelectCover={() => {}}
              onAddPress={() => {
                void handlePickProof();
              }}
              addLabel={t('organizerPlaceClaimUploadLabel')}
              coverLabel={t('organizerPlaceClaimProofSelected')}
            />

            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('organizerPlaceClaimProofHint')}
            </Text>

            <TouchableOpacity
              onPress={() => {
                void handleSubmit();
              }}
              disabled={submitting}
              className="mt-5 items-center rounded-2xl bg-[#4c669f] px-4 py-3"
              style={{ opacity: submitting ? 0.7 : 1 }}
            >
              <Text className="text-sm font-semibold text-white">
                {submitting
                  ? t('organizerPlaceClaimSubmitting')
                  : t('organizerPlaceClaimSubmit')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
