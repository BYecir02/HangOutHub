import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import Avatar from '@/shared/ui/primitives/Avatar';
import { getImageUrl } from '../../../services/api';
import { SocialUser } from '../../../types/social';

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
      <Avatar uri={avatarUri} label={user.displayName || user.username} size={56} />
      <View className="ml-4 flex-1 min-w-0">
        <Text className="text-base font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
          {user.displayName || user.username}
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>
          @{user.username}
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <View className="items-end gap-2 flex-shrink-0">
        {primaryAction}
        {secondaryAction}
      </View>
    </Container>
  );
}
