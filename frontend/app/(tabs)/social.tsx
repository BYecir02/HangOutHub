import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import SocialFeed from '../../components/social/SocialFeed';

export default function SocialScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
      <SocialFeed />
    </SafeAreaView>
  );
}
