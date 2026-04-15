import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import ScreenHeader from '@/components/ui/ScreenHeader';
import HeroBackground from '@/components/ui/HeroBackground';

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
  withHeroBackground?: boolean;
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
  withHeroBackground = false,
  containerClassName = '',
  contentClassName = '',
}: CatalogScreenLayoutProps) {
  return (
    <View
      className={`flex-1 ${
        withHeroBackground ? 'bg-transparent' : 'bg-gray-50 dark:bg-black'
      } pt-16 ${containerClassName}`.trim()}
    >
      {withHeroBackground ? <HeroBackground variant="catalog" /> : null}
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
