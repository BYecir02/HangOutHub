jest.mock('@expo/vector-icons', () => {
  return {
    Ionicons: () => null,
  };
});

jest.mock('expo-image', () => {
  return {
    Image: () => null,
  };
});

jest.mock(
  'react-native-css-interop/src/runtime/native/appearance-observables',
  () => ({
    __esModule: true,
    systemColorScheme: {
      get: () => 'light',
      set: jest.fn(),
    },
    colorScheme: {
      set: jest.fn(),
      get: () => 'light',
      getSystem: () => 'light',
      toggle: jest.fn(),
    },
    cssVariableObservable: jest.fn(),
    isReduceMotionEnabled: {
      get: () => false,
      set: jest.fn(),
    },
  }),
);

jest.mock(
  'react-native-css-interop/src/runtime/native/unit-observables',
  () => {
    const { INTERNAL_RESET, INTERNAL_SET } = jest.requireActual(
      'react-native-css-interop/src/shared',
    );

    const createObservable = (value: number) => ({
      get: () => value,
      [INTERNAL_RESET]: jest.fn(),
      [INTERNAL_SET]: jest.fn(),
    });

    return {
      __esModule: true,
      rem: createObservable(14),
      vw: createObservable(750),
      vh: createObservable(750),
      INTERNAL_RESET,
    };
  },
);

jest.mock('react-native/Libraries/Utilities/Appearance', () => ({
  getColorScheme: jest.fn(() => 'light'),
  addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  removeChangeListener: jest.fn(),
}));

jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 750, height: 1334, scale: 1, fontScale: 1 })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo', () => ({
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('react-native/Libraries/AppState/AppState', () => ({
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  }),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
}));