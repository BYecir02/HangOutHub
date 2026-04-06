import type { ComponentType } from 'react';

export default function MapTabRoute() {
  const MapScreen = require('@/components/screens/MapScreen.native').default as ComponentType;
  return <MapScreen />;
}
