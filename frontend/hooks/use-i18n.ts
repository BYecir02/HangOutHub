import { useCallback } from 'react';

import { useAppLanguage } from '@/hooks/use-app-language';
import {
  getLocaleForLanguage,
  translate,
  type TranslationKey,
} from '@/services/i18n';

type TranslationParams = Record<string, string | number>;

export function useI18n() {
  const language = useAppLanguage();
  const locale = getLocaleForLanguage(language);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      return translate(language, key, params);
    },
    [language],
  );

  return {
    language,
    locale,
    t,
  };
}
