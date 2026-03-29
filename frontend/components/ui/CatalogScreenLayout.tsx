import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import ScreenHeader from '@/components/ui/ScreenHeader';

type CatalogScreenLayoutProps = {
  title: string;
  subtitle?: string;
  label?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  locationScopeBar?: ReactNode;
  searchBar?: ReactNode;
  filterBar?: ReactNode;
  children: ReactNode;
  containerClassName?: string;
  contentClassName?: string;
};

export default function CatalogScreenLayout({
  title,
  subtitle,
  label,
  onBack,
  rightSlot,
  locationScopeBar,
  searchBar,
  filterBar,
  children,
  containerClassName = '',
  contentClassName = '',
}: CatalogScreenLayoutProps) {
  return (
    <View className={`flex-1 bg-gray-50 pt-16 dark:bg-black ${containerClassName}`.trim()}>
      <View className="px-5 pb-4">
        <ScreenHeader
          label={label}
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          rightSlot={rightSlot}
        />
      </View>

      {locationScopeBar ? <View className="px-5 pb-2">{locationScopeBar}</View> : null}

      {searchBar}
      {filterBar}

      <View className={`flex-1 ${contentClassName}`.trim()}>{children}</View>
    </View>
  );
}
