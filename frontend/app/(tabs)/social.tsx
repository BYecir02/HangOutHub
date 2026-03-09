import React from 'react';
import { View } from 'react-native';

import SocialFeed from '../../components/social/SocialFeed';

export default function SocialScreen() {
  return (
    <View className="flex-1 bg-gray-50 pt-12 dark:bg-black">
      <SocialFeed />
    </View>
  );
}
