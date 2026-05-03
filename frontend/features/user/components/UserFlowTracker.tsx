import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';

import {
  buildUserFlowContext,
  trackUserFlowEvent,
} from '@/services/user-flow-analytics';

export default function UserFlowTracker() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = pathname || '/';

    if (lastTrackedPathRef.current === currentPath) {
      return;
    }

    const previousPath = previousPathRef.current;
    lastTrackedPathRef.current = currentPath;
    previousPathRef.current = currentPath;

    const context = buildUserFlowContext(currentPath);

    void trackUserFlowEvent({
      eventName: 'screen_view',
      screenPath: currentPath,
      previousScreenPath: previousPath,
      screenKey: context.screenKey,
      screenName: context.screenName,
      path: currentPath,
      previousPath,
    });
  }, [pathname]);

  return null;
}
