import { useEffect, useMemo, useState } from 'react';

interface CityOption {
  id: number;
  name: string;
  country: string | null;
}

interface CitySelectorProps {
  value: CityOption | null;
  cities: CityOption[];
  disabled?: boolean;
  onChange: (city: CityOption | null) => void;
  onCreate: (payload: { name: string; country: string }) => Promise<CityOption>;
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatCityLabel(city: CityOption) {
  return `${city.name}${city.country ? ` - ${city.country}` : ''}`;
}

export default function CitySelector({
  value,
  cities,
  disabled = false,
  onChange,
  onCreate,
}: CitySelectorProps) {
  const [countryQuery, setCountryQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [showCountryCreate, setShowCountryCreate] = useState(false);
  const [showCityCreate, setShowCityCreate] = useState(false);
  const [cityName, setCityName] = useState('');
  const [creationError, setCreationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const countries = useMemo(() => {
    const seen = new Set<string>();

    return cities
      .map((city) => city.country?.trim())
      .filter((country): country is string => Boolean(country))
      .filter((country) => {
        const normalized = normalize(country);
        if (seen.has(normalized)) {
          return false;
        }

        seen.add(normalized);
        return true;
      })
      .sort((left, right) => left.localeCompare(right));
  }, [cities]);

  const matchingCountries = useMemo(() => {
    const normalizedQuery = normalize(countryQuery);

    if (!normalizedQuery) {
      return countries.slice(0, 8);
    }

    return countries
      .filter((country) => normalize(country).includes(normalizedQuery))
      .slice(0, 8);
  }, [countries, countryQuery]);

  const citiesForCountry = useMemo(() => {
    const normalizedCountry = normalize(selectedCountry);

    if (!normalizedCountry) {
      return [];
    }

    return cities
      .filter((city) => normalize(city.country ?? '') === normalizedCountry)
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [cities, selectedCountry]);

  const matchingCities = useMemo(() => {
    const normalizedQuery = normalize(cityQuery);

    if (!normalizedQuery) {
      return citiesForCountry.slice(0, 8);
    }

    return citiesForCountry
      .filter((city) => normalize(city.name).includes(normalizedQuery))
      .slice(0, 8);
  }, [citiesForCountry, cityQuery]);

  useEffect(() => {
    if (!value) {
      return;
    }

    setSelectedCountry(value.country ?? '');
    setCountryQuery(value.country ?? '');
    setSelectedCityId(value.id);
    setCityQuery(value.name);
  }, [value]);

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    setCountryQuery(country);
    setSelectedCityId(null);
    setCityQuery('');
    setShowCountryCreate(false);
    setShowCityCreate(false);
    setCreationError('');
    onChange(null);
  };

  const handleCreateCountry = () => {
    const normalizedCountry = countryQuery.trim();

    if (!normalizedCountry) {
      setCreationError('Le pays est obligatoire.');
      return;
    }

    setSelectedCountry(normalizedCountry);
    setCountryQuery(normalizedCountry);
    setShowCountryCreate(false);
    setSelectedCityId(null);
    setCityQuery('');
    setCreationError('');
    onChange(null);
  };

  const handleSelectCity = (city: CityOption) => {
    setSelectedCityId(city.id);
    setCityQuery(city.name);
    setShowCityCreate(false);
    setCreationError('');
    onChange(city);
  };

  const handleCreateCity = async () => {
    const normalizedName = cityName.trim();
    const normalizedCountry = selectedCountry.trim();

    if (!normalizedCountry) {
      setCreationError('Selectionne ou cree un pays avant la ville.');
      return;
    }

    if (!normalizedName) {
      setCreationError('Le nom de la ville est obligatoire.');
      return;
    }

    setIsSaving(true);
    setCreationError('');

    try {
      const created = await onCreate({
        name: normalizedName,
        country: normalizedCountry,
      });

      setSelectedCityId(created.id);
      setCityQuery(created.name);
      setShowCityCreate(false);
      onChange(created);
    } catch (error) {
      setCreationError(error instanceof Error ? error.message : 'Impossible de creer la ville.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedLabel = value ? formatCityLabel(value) : 'Aucune ville selectionnee';

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pays</p>
          <p className="mt-1 text-sm text-slate-500">
            Choisis un pays existant, ou saisis-en un nouveau si besoin.
          </p>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            value={countryQuery}
            onChange={(event) => {
              const nextValue = event.target.value;
              setCountryQuery(nextValue);
              setSelectedCountry(nextValue);
              setSelectedCityId(null);
              setCityQuery('');
              setShowCountryCreate(false);
              setShowCityCreate(false);
              setCreationError('');
              onChange(null);
            }}
            placeholder="Rechercher un pays"
            disabled={disabled}
            className="w-full rounded-xl border border-slate-200 bg-white px-9 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {countryQuery.trim() ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
            {matchingCountries.length ? (
              <div className="max-h-44 divide-y divide-slate-100 overflow-y-auto">
                {matchingCountries.map((country) => (
                  <button
                    key={country}
                    type="button"
                    onClick={() => handleSelectCountry(country)}
                    disabled={disabled}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    <span className="text-sm font-semibold text-slate-700">{country}</span>
                    <span className="text-xs font-semibold text-brand-600">Choisir</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 p-4">
                <p className="text-sm font-semibold text-slate-700">Aucun pays trouve.</p>
                <p className="text-xs text-slate-500">
                  Tu peux utiliser ce pays pour la suite du formulaire.
                </p>
                {!showCountryCreate ? (
                  <button
                    type="button"
                    onClick={() => setShowCountryCreate(true)}
                    disabled={disabled}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    Creer ce pays
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {showCountryCreate ? (
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
            <span className="mr-auto text-sm text-slate-600">
              Utiliser <strong>{countryQuery.trim()}</strong> pour la creation de la ville.
            </span>
            <button
              type="button"
              onClick={() => {
                setShowCountryCreate(false);
                setCountryQuery('');
                setSelectedCountry('');
                onChange(null);
              }}
              disabled={disabled || isSaving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleCreateCountry}
              disabled={disabled || isSaving}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              Confirmer
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ville selectionnee</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{selectedLabel}</p>
          </div>
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setSelectedCityId(null);
                setCityQuery('');
                setCreationError('');
              }}
              disabled={disabled}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:opacity-60"
            >
              Retirer
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ville</p>
          <p className="mt-1 text-sm text-slate-500">
            Les villes sont filtrées par pays. Crée la ville seulement si elle n'existe pas.
          </p>
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            value={cityQuery}
            onChange={(event) => {
              setCityQuery(event.target.value);
              setSelectedCityId(null);
              setShowCityCreate(false);
              setCreationError('');
              onChange(null);
            }}
            placeholder={selectedCountry ? `Rechercher une ville en ${selectedCountry}` : 'Choisis un pays d’abord'}
            disabled={disabled || !selectedCountry}
            className="w-full rounded-xl border border-slate-200 bg-white px-9 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {selectedCountry ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
            {matchingCities.length ? (
              <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
                {matchingCities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    disabled={disabled}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{city.name}</p>
                      <p className="text-xs text-slate-500">{city.country ?? selectedCountry}</p>
                    </div>
                    <span className="text-xs font-semibold text-brand-600">Choisir</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 p-4">
                <p className="text-sm font-semibold text-slate-700">Aucune ville trouvee dans ce pays.</p>
                <p className="text-xs text-slate-500">
                  Tu peux creer cette ville dans {selectedCountry}.
                </p>
                {!showCityCreate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCityName(cityQuery.trim() || '');
                      setShowCityCreate(true);
                      setCreationError('');
                    }}
                    disabled={disabled}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    Creer cette ville
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {showCityCreate ? (
          <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
                <span>Nom de la ville</span>
                <input
                  value={cityName}
                  onChange={(event) => setCityName(event.target.value)}
                  disabled={disabled || isSaving}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
                  placeholder="Ex: Bordeaux"
                />
              </label>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 md:col-span-2">
                Pays retenu: <span className="font-semibold">{selectedCountry}</span>
              </div>
            </div>
            {creationError ? <p className="text-sm text-rose-600">{creationError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCityCreate(false);
                  setCreationError('');
                }}
                disabled={disabled || isSaving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleCreateCity()}
                disabled={disabled || isSaving}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {isSaving ? 'Creation...' : 'Creer la ville'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}