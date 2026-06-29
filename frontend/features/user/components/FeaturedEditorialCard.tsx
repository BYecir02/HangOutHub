import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MediaFrame from '@/shared/ui/MediaFrame';
import { getImageUrl } from '@/services/api';
import { isVideoUrl } from '@/services/shared/media';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';

import type { HomeFeaturedItem } from './home.types';

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

interface FeaturedEditorialCardProps {
  item: HomeFeaturedItem;
  width: number;
  shouldPlay?: boolean;
  onPress: () => void;
}

// Cadre d'affiche à hauteur fixe : l'affiche y est montrée ENTIÈRE (contain),
// centrée sur un flou d'elle-même qui comble les bords -> cartes uniformes,
// affiche jamais recadrée.
const POSTER_HEIGHT = 330;

/**
 * Carte "couverture éditoriale" (test) : l'affiche de l'organisateur occupe
 * la majeure partie (aucun texte/badge dessus), posée sur un socle d'infos sobre
 * (titre, lieu, date, heure, prix).
 */
export default function FeaturedEditorialCard({
  item,
  width,
  shouldPlay = false,
  onPress,
}: FeaturedEditorialCardProps) {
  const { locale } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const { event, cityLabel, placeLabel, priceLabel } = item;

  const cover = getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER;
  const isVideo = isVideoUrl(cover);
  const start = new Date(event.startTime);
  const validDate = !Number.isNaN(start.getTime());
  const dateLabel = validDate
    ? start.toLocaleDateString(locale, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      })
    : '';
  const timeLabel = validDate
    ? start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : '';

  const location = [placeLabel, cityLabel]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(' • ');

  const mutedColor = isDark ? '#9aa4b2' : '#6b7280';

  return (
    <TouchableOpacity
      activeOpacity={0.94}
      onPress={onPress}
      style={{
        width,
        shadowColor: '#000000',
        shadowOpacity: isDark ? 0.45 : 0.16,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 18,
        elevation: 10,
      }}
      className="rounded-[26px] bg-white dark:bg-gray-900"
    >
      {/* L'affiche : montrée ENTIÈRE (contain), centrée sur un flou d'elle-même. */}
      <View
        style={{
          width,
          height: POSTER_HEIGHT,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          overflow: 'hidden',
          backgroundColor: '#0b0b0d',
        }}
      >
        {/* Fond : flou de l'affiche (images uniquement) pour combler les bords. */}
        {!isVideo ? (
          <Image
            source={{ uri: cover }}
            blurRadius={24}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {/* Voile pour le contraste / homogénéité. */}
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]}
        />
        {/* L'affiche entière, par-dessus. */}
        <MediaFrame
          source={cover}
          style={StyleSheet.absoluteFill}
          adaptiveHeight={false}
          shouldPlay={shouldPlay}
          muted
          loop
          showControls={false}
          contentFit="contain"
        />
      </View>

      {/* Le socle d'infos. */}
      <View className="px-4 pb-4 pt-3">
        <Text
          numberOfLines={2}
          className="text-[22px] font-semibold leading-7 text-gray-900 dark:text-white"
        >
          {event.title}
        </Text>

        {location ? (
          <View className="mt-1.5 flex-row items-center">
            <Ionicons name="location-outline" size={15} color={mutedColor} />
            <Text
              numberOfLines={1}
              className="ml-1 text-[15px] text-gray-500 dark:text-gray-400"
            >
              {location}
            </Text>
          </View>
        ) : null}

        <View className="mt-3 flex-row items-center justify-between">
          <InfoBlock icon="calendar-outline" label={dateLabel} color={mutedColor} />
          <InfoBlock icon="time-outline" label={timeLabel} color={mutedColor} />
          <InfoBlock icon="pricetag-outline" label={priceLabel} color={mutedColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function InfoBlock({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}) {
  if (!label) {
    return null;
  }

  return (
    <View className="flex-row items-center">
      <Ionicons name={icon} size={14} color={color} />
      <Text className="ml-1 text-[13px] font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Text>
    </View>
  );
}
