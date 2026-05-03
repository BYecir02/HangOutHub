import { useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

import {
	getCurrentThemePreference,
	loadAppPreferences,
	subscribeThemePreference,
} from '@/services/auth/app-preferences';

export function useColorScheme() {
	const deviceScheme = useDeviceColorScheme() || 'light';
	const [themePreference, setThemePreference] = useState(
		getCurrentThemePreference(),
	);

	useEffect(() => {
		const unsubscribe = subscribeThemePreference(setThemePreference);
		void loadAppPreferences();

		return unsubscribe;
	}, []);

	if (themePreference === 'system') {
		return deviceScheme;
	}

	return themePreference;
}
