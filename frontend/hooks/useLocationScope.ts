import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  getStoredLocation,
  type StoredLocation,
} from '@/services/location-preferences';

interface UseLocationScopeOptions {
  defaultCountry: string;
  currentLabel: string;
  allCitiesLabel: string;
  allCountriesLabel: string;
}

interface LocationCandidate {
  city?: string | null;
  country?: string | null;
  address?: string | null;
}

function normalizeValue(value?: string | null): string {
  return value?.trim().toLowerCase() || '';
}

export function useLocationScope(options: UseLocationScopeOptions) {
  const [selectedLocation, setSelectedLocation] = useState<StoredLocation | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);

  const hydrateLocation = useCallback(async () => {
    const storedLocation = await getStoredLocation();
    setSelectedLocation(storedLocation);
    setHydrated(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const load = async () => {
        const storedLocation = await getStoredLocation();
        if (!isMounted) {
          return;
        }
        setSelectedLocation(storedLocation);
        setHydrated(true);
      };

      void load();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const defaultCountry = useMemo(
    () => normalizeValue(options.defaultCountry),
    [options.defaultCountry],
  );

  const activeCountry = useMemo(
    () => normalizeValue(selectedLocation?.country),
    [selectedLocation?.country],
  );

  const activeCityName = useMemo(() => {
    const shouldUseCity =
      selectedLocation?.mode === 'city' ||
      (!selectedLocation?.mode && selectedLocation?.cityName);

    if (!shouldUseCity) {
      return '';
    }

    return normalizeValue(selectedLocation?.cityName);
  }, [selectedLocation?.cityName, selectedLocation?.mode]);

  const matchesLocation = useCallback(
    (candidate: LocationCandidate) => {
      const candidateCountry = normalizeValue(candidate.country) || defaultCountry;

      if (activeCountry && candidateCountry !== activeCountry) {
        return false;
      }

      if (!activeCityName) {
        return true;
      }

      const candidateCity = normalizeValue(candidate.city);
      const normalizedAddress = normalizeValue(candidate.address);

      return (
        candidateCity === activeCityName ||
        (!!normalizedAddress && normalizedAddress.includes(activeCityName))
      );
    },
    [activeCityName, activeCountry, defaultCountry],
  );

  const filterByLocation = useCallback(
    <TItem,>(
      items: TItem[],
      toCandidate: (item: TItem) => LocationCandidate,
    ) => items.filter((item) => matchesLocation(toCandidate(item))),
    [matchesLocation],
  );

  const locationLabel = useMemo(() => {
    if (activeCityName) {
      return `${options.currentLabel}: ${selectedLocation?.cityName}, ${
        selectedLocation?.country || options.defaultCountry
      }`;
    }

    if (selectedLocation?.country) {
      return `${options.currentLabel}: ${options.allCitiesLabel} - ${
        selectedLocation.country
      }`;
    }

    return `${options.currentLabel}: ${options.allCountriesLabel}`;
  }, [
    activeCityName,
    options.allCitiesLabel,
    options.allCountriesLabel,
    options.currentLabel,
    options.defaultCountry,
    selectedLocation?.cityName,
    selectedLocation?.country,
  ]);

  const locationValueLabel = useMemo(() => {
    if (activeCityName) {
      return `${selectedLocation?.cityName}, ${
        selectedLocation?.country || options.defaultCountry
      }`;
    }

    if (selectedLocation?.country) {
      return selectedLocation.country;
    }

    return options.allCountriesLabel;
  }, [
    activeCityName,
    options.allCountriesLabel,
    options.defaultCountry,
    selectedLocation?.cityName,
    selectedLocation?.country,
  ]);

  return {
    hydrated,
    selectedLocation,
    activeCityName,
    activeCountry,
    defaultCountry,
    locationLabel,
    locationValueLabel,
    setSelectedLocation,
    hydrateLocation,
    matchesLocation,
    filterByLocation,
  };
}
