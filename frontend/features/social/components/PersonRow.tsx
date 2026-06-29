import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import Avatar from '@/shared/ui/primitives/Avatar';
import { getImageUrl } from '../../../services/api';
import { SocialUser } from '@/features/social/types';

interface PersonRowProps {
  user: SocialUser;
  subtitle?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  onPress?: () => void;
  avatarSize?: number;
}

export default function PersonRow({
  user,
  subtitle,
  primaryAction,
  secondaryAction,
  onPress,
  avatarSize = 56,
}: PersonRowProps) {
  const avatarUri =
    getImageUrl(user.avatarUrl) || `https://i.pravatar.cc/150?u=${user.id}`;

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      className="flex-row items-center py-3"
      activeOpacity={0.7}
    >
      <Avatar uri={avatarUri} label={user.displayName || user.username} size={48} />
      <View className="ml-4 flex-1 min-w-0">
        <Text className="text-base font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
          {user.displayName || user.username}
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>
          @{user.username}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View className="items-end gap-2 flex-shrink-0">
        {primaryAction}
        {secondaryAction}
      </View>
    </Container>
  );
}
