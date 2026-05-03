import type { ComponentType } from 'react';

export default function MapTabRoute() {
  const MapScreen = require('@/features/discover/components/MapScreen.native').default as ComponentType;
  return <MapScreen />;
}
