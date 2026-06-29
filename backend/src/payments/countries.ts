/**
 * Configuration pays (léger, en code — pas de table BDD pour l'instant).
 * Source du "pays" dans le projet : champ texte `City.country`.
 * On normalise ce texte libre -> code ISO2 -> config (devise, opérateurs, etc.).
 */

export interface CountryConfig {
  /** Code ISO2, ex: 'BJ'. */
  code: string;
  /** Nom affichable. */
  name: string;
  /** Devise ISO, ex: 'XOF'. */
  currency: string;
  /** Code pays FedaPay pour le numéro de téléphone (minuscule), ex: 'bj'. */
  phone: string;
  /** Opérateurs Mobile Money disponibles (pour un futur sélecteur). */
  methods: string[];
}

const COUNTRIES: Record<string, CountryConfig> = {
  BJ: { code: 'BJ', name: 'Benin', currency: 'XOF', phone: 'bj', methods: ['mtn', 'moov'] },
  CI: {
    code: 'CI',
    name: "Cote d'Ivoire",
    currency: 'XOF',
    phone: 'ci',
    methods: ['orange', 'moov', 'wave', 'mtn'],
  },
  TG: { code: 'TG', name: 'Togo', currency: 'XOF', phone: 'tg', methods: ['moov', 'tmoney'] },
  SN: { code: 'SN', name: 'Senegal', currency: 'XOF', phone: 'sn', methods: ['orange', 'free', 'wave'] },
  NE: { code: 'NE', name: 'Niger', currency: 'XOF', phone: 'ne', methods: ['airtel', 'moov'] },
};

export const DEFAULT_COUNTRY: CountryConfig = COUNTRIES.BJ;

// Nom de pays (texte libre, déjà normalisé) -> code ISO2.
const NORMALIZED_NAME_TO_CODE: Record<string, string> = {
  benin: 'BJ',
  'cote d ivoire': 'CI',
  'ivory coast': 'CI',
  togo: 'TG',
  senegal: 'SN',
  niger: 'NE',
};

/** Enleve accents/ponctuation et met en minuscule pour comparer du texte libre. */
function normalize(text?: string | null): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Resout un nom de pays (texte libre `City.country`) en config. Defaut : Benin. */
export function resolveCountry(countryText?: string | null): CountryConfig {
  const code = NORMALIZED_NAME_TO_CODE[normalize(countryText)];
  return (code && COUNTRIES[code]) || DEFAULT_COUNTRY;
}

export function getCountryByCode(code?: string | null): CountryConfig | undefined {
  return code ? COUNTRIES[code.toUpperCase()] : undefined;
}

/** Libellés affichables des opérateurs Mobile Money. */
export const OPERATOR_LABELS: Record<string, string> = {
  mtn: 'MTN MoMo',
  moov: 'Moov Money',
  orange: 'Orange Money',
  wave: 'Wave',
  tmoney: 'T-Money',
  free: 'Free Money',
  airtel: 'Airtel Money',
};
