import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { getImageUrl } from '../../services/api';
import { SocialUser } from '../../types/social';

interface PersonRowProps {
  user: SocialUser;
  subtitle: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  onPress?: () => void;
}

export default function PersonRow({
  user,
  subtitle,
  primaryAction,
  secondaryAction,
  onPress,
}: PersonRowProps) {
  const avatarUri =
    getImageUrl(user.avatarUrl) || `https://i.pravatar.cc/150?u=${user.id}`;

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-[28px] bg-gray-50 px-4 py-4 dark:bg-gray-900"
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: avatarUri }}
        className="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-800"
        resizeMode="cover"
      />
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">
          {user.displayName || user.username}
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          @{user.username}
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </Text>
      </View>
      <View className="items-end gap-2">
        {primaryAction}
        {secondaryAction}
      </View>
    </Container>
  );
}
