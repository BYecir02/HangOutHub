import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import LogoSpinner from '@/shared/ui/LogoSpinner';

export default function EventBookingRedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  useEffect(() => {
    if (!params.id) {
      router.replace('/events');
      return;
    }

    router.replace({
      pathname: '/event/[id]',
      params: {
        id: params.id,
        tab: 'tickets',
      },
    });
  }, [params.id, router]);

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
      <LogoSpinner size={44} />
    </View>
  );
}
