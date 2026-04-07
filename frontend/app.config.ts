import { type ConfigContext, type ExpoConfig } from 'expo/config';

const PUBLIC_API_URL = 'https://hang-out-hub.vercel.app';

function normalizeApiUrl(value: string | undefined | null) {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const localApiUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
  const overrideApiUrl = normalizeApiUrl(process.env.HANGOUTHUB_API_URL);
  const isReleaseBuild = ['preview', 'production'].includes(
    process.env.EAS_BUILD_PROFILE || '',
  );

  const apiUrl = overrideApiUrl || (isReleaseBuild ? PUBLIC_API_URL : localApiUrl);

  return {
    ...config,
    android: {
      ...(config.android || {}),
      softwareKeyboardLayoutMode: 'resize',
    },
    extra: {
      ...(config.extra || {}),
      apiUrl: apiUrl || PUBLIC_API_URL,
    },
  } as ExpoConfig;
};
