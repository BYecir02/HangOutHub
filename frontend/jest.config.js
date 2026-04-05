module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/.expo/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^.+\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-router|nativewind|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|expo-image|expo-video|expo-linear-gradient|expo-blur|expo-camera|expo-file-system|expo-secure-store|@expo/vector-icons|socket.io-client)',
  ],
};