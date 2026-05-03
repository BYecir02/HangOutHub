import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import SocialFeed from '../../features/social/components/SocialFeed';

export default function SocialScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
      <SocialFeed />
    </SafeAreaView>
  );
}
