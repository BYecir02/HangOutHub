import React, { type ReactNode } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type EntityCardBadge = {
  label: string;
  color: string;
  backgroundColor?: string;
};

type EntityCardMetaRow = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  iconColor: string;
  numberOfLines?: number;
};

type EntityCardRowProps = {
  variant?: 'row';
  imageUrl: string;
  title: string;
  subtitle?: string;
  badge?: EntityCardBadge;
  meta?: string;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  onPress?: () => void;
};

type EntityCardCoverProps = {
  variant: 'cover';
  imageUrl: string;
  title: string;
  topContent?: ReactNode;
  metaRows?: EntityCardMetaRow[];
  onPress?: () => void;
};

type EntityCardProps = EntityCardRowProps | EntityCardCoverProps;

export default function EntityCard(props: EntityCardProps) {
  if (props.variant === 'cover') {
    const { imageUrl, title, topContent, metaRows = [], onPress } = props;

    return (
      <TouchableOpacity
        onPress={onPress}
        className="overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
      >
        <Image
          source={{ uri: imageUrl }}
          className="h-52 w-full bg-gray-200 dark:bg-gray-800"
          resizeMode="cover"
        />

        <View className="p-5">
          {topContent}

          <Text className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </Text>

          {metaRows.map((row, index) => (
            <View
              key={`meta-${row.icon}-${row.text}-${index}`}
              className={`${index === 0 ? 'mt-3' : 'mt-2'} flex-row items-center`}
            >
              <Ionicons name={row.icon} size={16} color={row.iconColor} />
              <Text
                className="ml-2 flex-1 text-sm text-gray-500 dark:text-gray-300"
                numberOfLines={row.numberOfLines ?? 1}
              >
                {row.text}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  }

  const {
    imageUrl,
    title,
    subtitle,
    badge,
    meta,
    footerLeft,
    footerRight,
    onPress,
  } = props;

  const defaultFooterRight = onPress ? (
    <Ionicons name="arrow-forward-circle" size={24} color={badge?.color || '#4c669f'} />
  ) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row overflow-hidden rounded-[28px] border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
    >
      <Image
        source={{ uri: imageUrl }}
        className="h-28 w-28 rounded-2xl bg-gray-200 dark:bg-gray-800"
        resizeMode="cover"
      />

      <View className="ml-4 flex-1 justify-between py-1">
        <View>
          {badge ? (
            <View
              className="self-start rounded-full px-3 py-1.5"
              style={{
                backgroundColor: badge.backgroundColor || `${badge.color}20`,
              }}
            >
              <Text className="text-xs font-semibold" style={{ color: badge.color }}>
                {badge.label}
              </Text>
            </View>
          ) : null}

          <Text className="mt-3 text-lg font-bold text-gray-900 dark:text-white" numberOfLines={2}>
            {title}
          </Text>

          {subtitle ? (
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            {footerLeft ? (
              footerLeft
            ) : meta ? (
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {meta}
              </Text>
            ) : null}
          </View>

          {footerRight === undefined ? defaultFooterRight : footerRight}
        </View>
      </View>
    </TouchableOpacity>
  );
}
