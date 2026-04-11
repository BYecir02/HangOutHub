import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiUpload,
  resolveImageUrl,
} from '../lib/api';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import FormField from '../components/FormField';
import LoadingState from '../components/LoadingState';
import MediaPreview from '../components/MediaPreview';
import Card from '../components/Card';
import CitySelector from '../components/CitySelector';
import SelectField from '../components/SelectField';
import { getMediaUploadErrorMessage } from '../lib/media';

interface CityOption {
  id: number;
  name: string;
  country: string;
}

interface PlaceDetails {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  openingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceLevel?: number | null;
  moderationStatus?: string | null;
  externalProvider?: string | null;
  externalProviderId?: string | null;
  externalUrl?: string | null;
  providerLatitude?: number | null;
  providerLongitude?: number | null;
  providerMatchConfidence?: number | null;
  providerMatchedAt?: string | null;
  coverUrl?: string | null;
  images?: string[];
  City?: CityOption | null;
  PlaceTag?: Array<{
    Tag?: {
      id: number;
      name: string;
      status?: string | null;
    } | null;
  }>;
}

interface CategoryOption {
  id: number;
  name: string;
  Tag?: Array<{
    id: number;
    name: string;
    status?: string | null;
  }>;
}

interface DuplicatePlaceSource {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  openingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceLevel?: number | null;
  moderationStatus?: string | null;
  externalProvider?: string | null;
  externalProviderId?: string | null;
  externalUrl?: string | null;
  providerLatitude?: number | null;
  providerLongitude?: number | null;
  providerMatchConfidence?: number | null;
  coverUrl?: string | null;
  images?: string[];
  City?: CityOption | null;
  PlaceTag?: Array<{
    Tag?: {
      id: number;
      name: string;
      status?: string | null;
    } | null;
  }>;
}

type ParsedProviderLink = {
  provider: string | null;
  providerId: string | null;
  providerLatitude: number | null;
  providerLongitude: number | null;
  confidence: number;
};

function formatProviderLabel(value?: string | null) {
  const normalized = (value || '').trim().toUpperCase();
  if (!normalized) {
    return '-';
  }
  if (normalized === 'GOOGLE') {
    return 'Google Maps';
  }
  if (normalized === 'APPLE') {
    return 'Apple Maps';
  }
  return normalized;
}

function parseCoordinatePair(rawValue?: string | null) {
  if (!rawValue) {
    return null;
  }

  const [rawLatitude, rawLongitude] = rawValue.split(',').map((part) => part.trim());
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function getFirstMatch(value: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1] && match?.[2]) {
      return {
        latitude: Number(match[1]),
        longitude: Number(match[2]),
      };
    }
  }

  return null;
}

function computeDistanceMeters(
  firstLatitude?: number | null,
  firstLongitude?: number | null,
  secondLatitude?: number | null,
  secondLongitude?: number | null,
) {
  if (
    !Number.isFinite(firstLatitude as number) ||
    !Number.isFinite(firstLongitude as number) ||
    !Number.isFinite(secondLatitude as number) ||
    !Number.isFinite(secondLongitude as number)
  ) {
    return null;
  }

  const earthRadiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians((secondLatitude as number) - (firstLatitude as number));
  const deltaLongitude = toRadians((secondLongitude as number) - (firstLongitude as number));
  const latitudeA = toRadians(firstLatitude as number);
  const latitudeB = toRadians(secondLatitude as number);

  const haversine =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2) *
      Math.cos(latitudeA) *
      Math.cos(latitudeB);

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function formatDistanceLabel(distanceMeters: number | null) {
  if (distanceMeters === null) {
    return '-';
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

function getDistanceVerdict(distanceMeters: number | null) {
  if (distanceMeters === null) {
    return 'Coordonnees provider non detectees';
  }

  if (distanceMeters < 30) {
    return 'Correspondance tres probable';
  }

  if (distanceMeters < 100) {
    return 'A verifier';
  }

  return 'Probable faux rapprochement';
}

function parseGoogleMapsLink(rawUrl: string): ParsedProviderLink {
  let providerId: string | null = null;
  let providerCoordinates: { latitude: number; longitude: number } | null = null;

  const decodedIdMatches = [
    rawUrl.match(/!16s%2Fg%2F([^!?&]+)/i),
    rawUrl.match(/!16s\/g\/([^!?&]+)/i),
    rawUrl.match(/!1s([^!?&]+)/i),
    rawUrl.match(/!2s([^!?&]+)/i),
  ];

  for (const match of decodedIdMatches) {
    if (match?.[1]) {
      const candidate = decodeURIComponent(match[1]);
      providerId = candidate.startsWith('/g/') ? candidate : candidate;
      break;
    }
  }

  if (!providerId) {
    const cidMatch = rawUrl.match(/0x[0-9a-f]+:0x[0-9a-f]+/i);
    if (cidMatch?.[0]) {
      providerId = cidMatch[0];
    }
  }

  providerCoordinates = getFirstMatch(rawUrl, [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
    /!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/i,
  ]);

  return {
    provider: 'GOOGLE',
    providerId,
    providerLatitude: providerCoordinates?.latitude ?? null,
    providerLongitude: providerCoordinates?.longitude ?? null,
    confidence:
      providerId && providerCoordinates
        ? 0.92
        : providerId || providerCoordinates
          ? 0.78
          : 0.55,
  };
}

function parseAppleMapsLink(rawUrl: string): ParsedProviderLink {
  let providerId: string | null = null;
  let providerCoordinates: { latitude: number; longitude: number } | null = null;
  try {
    const url = new URL(rawUrl);
    providerId = url.searchParams.get('place-id');
    providerCoordinates = parseCoordinatePair(url.searchParams.get('coordinate'));

    if (!providerCoordinates) {
      providerCoordinates = parseCoordinatePair(url.searchParams.get('ll'));
    }
  } catch {
    providerId = null;
  }

  return {
    provider: 'APPLE',
    providerId,
    providerLatitude: providerCoordinates?.latitude ?? null,
    providerLongitude: providerCoordinates?.longitude ?? null,
    confidence:
      providerId && providerCoordinates
        ? 0.99
        : providerId || providerCoordinates
          ? 0.87
          : 0.75,
  };
}

function parseProviderLink(rawUrl: string): ParsedProviderLink | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname.includes('maps.apple.com') || hostname.includes('apple.com')) {
    return parseAppleMapsLink(trimmed);
  }

  if (hostname.includes('google.') || hostname.includes('goo.gl')) {
    return parseGoogleMapsLink(trimmed);
  }

  return null;
}

const EMPTY_PLACE: PlaceDetails = {
  id: '',
  name: '',
  category: '',
  description: '',
  address: '',
  phone: '',
  whatsapp: '',
  openingHours: '',
  latitude: 0,
  longitude: 0,
  priceLevel: 1,
  moderationStatus: 'PENDING',
  externalProvider: null,
  externalProviderId: null,
  externalUrl: null,
  providerLatitude: null,
  providerLongitude: null,
  providerMatchConfidence: null,
  images: [],
  City: null,
  coverUrl: null,
  PlaceTag: [],
};

export default function PlaceEditPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isCreateMode = !params.id;
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [openCategoryId, setOpenCategoryId] = useState<number | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const [tagCreationError, setTagCreationError] = useState('');
  const [tagCreationCategoryId, setTagCreationCategoryId] = useState<number | null>(
    null,
  );
  const [showModerationAdvanced, setShowModerationAdvanced] = useState(false);
  const [error, setError] = useState('');

  const handleCreateCity = async (payload: { name: string; country: string }) => {
    const created = await apiPost<CityOption>('/cities', payload);
    setCities((current) => {
      const next = current.some((item) => item.id === created.id)
        ? current
        : [...current, created];

      return [...next].sort((left, right) => left.name.localeCompare(right.name));
    });

    return created;
  };

  const buildCreateDraft = (source: DuplicatePlaceSource): PlaceDetails => ({
    ...EMPTY_PLACE,
    name: source.name ? `${source.name} (copie)` : 'Nouveau lieu',
    category: source.category ?? '',
    description: source.description ?? '',
    address: source.address ?? '',
    phone: source.phone ?? '',
    whatsapp: source.whatsapp ?? '',
    openingHours: source.openingHours ?? '',
    latitude: source.latitude ?? 0,
    longitude: source.longitude ?? 0,
    priceLevel: source.priceLevel ?? 1,
    moderationStatus: 'PENDING',
    externalProvider: null,
    externalProviderId: null,
    externalUrl: null,
    providerLatitude: null,
    providerLongitude: null,
    providerMatchConfidence: null,
    City: source.City ?? null,
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const duplicateFrom = searchParams.get('duplicateFrom');
        const [placeData, cityData, categoryData] = await Promise.all([
          params.id
            ? apiGet<PlaceDetails>(`/places/${params.id}`)
            : duplicateFrom
              ? apiGet<DuplicatePlaceSource>(`/places/${duplicateFrom}`)
              : Promise.resolve(EMPTY_PLACE),
          apiGet<CityOption[]>('/cities'),
          apiGet<CategoryOption[]>('/categories'),
        ]);

        if (isMounted) {
          if (params.id) {
            setPlace(placeData);
            setGalleryImages(placeData.images || []);
            setSelectedTagIds(
              placeData.PlaceTag?.map((entry) => entry.Tag?.id || 0).filter(Boolean) ||
                [],
            );
            setShowModerationAdvanced(
              Boolean(
                placeData.externalProvider ||
                  placeData.externalProviderId ||
                  placeData.externalUrl ||
                  placeData.providerMatchConfidence !== null,
              ),
            );
          } else if (duplicateFrom) {
            const source = placeData as DuplicatePlaceSource;
            setPlace(buildCreateDraft(source));
            setGalleryImages([]);
            setShowModerationAdvanced(false);
            setSelectedTagIds(
              source.PlaceTag?.map((entry) => entry.Tag?.id || 0).filter(Boolean) ||
                [],
            );
          } else {
            setPlace(placeData);
            setGalleryImages(placeData.images || []);
            setShowModerationAdvanced(false);
            setSelectedTagIds(
              placeData.PlaceTag?.map((entry) => entry.Tag?.id || 0).filter(Boolean) ||
                [],
            );
          }
          setCities(cityData);
          setCategories(categoryData);
          setCoverFile(null);
          setGalleryFiles([]);
          setCoverPreview(null);
          setGalleryPreviews([]);
          setOpenCategoryId(null);
          setTagSearch('');
          setTagCreationError('');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [params.id, searchParams]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [coverFile]);

  useEffect(() => {
    if (galleryFiles.length === 0) {
      setGalleryPreviews([]);
      return;
    }

    const previewUrls = galleryFiles.map((file) => URL.createObjectURL(file));
    setGalleryPreviews(previewUrls);

    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [galleryFiles]);

  useEffect(() => {
    setTagSearch('');
    setTagCreationError('');
  }, [openCategoryId]);

  const handleCreateTag = async (categoryId: number, name: string) => {
    setTagCreationError('');
    setTagCreationCategoryId(categoryId);
    try {
      const created = await apiPost<{
        id: number;
        name: string;
        status?: string | null;
      }>(`/categories/${categoryId}/tags`, { name });

      let finalTag = created;
      if (created.status && created.status !== 'APPROVED') {
        try {
          finalTag = await apiPatch<{
            id: number;
            name: string;
            status?: string | null;
          }>(`/categories/tags/${created.id}`, { status: 'APPROVED' });
        } catch {
          // Si l'approbation echoue, on garde le tag cree.
        }
      }

      setCategories((current) =>
        current.map((category) => {
          if (category.id !== categoryId) {
            return category;
          }
          const existing = (category.Tag || []).some((tag) => tag.id === finalTag.id);
          return {
            ...category,
            Tag: existing ? category.Tag : [...(category.Tag || []), finalTag],
          };
        }),
      );
      setSelectedTagIds((current) =>
        current.includes(finalTag.id) ? current : [...current, finalTag.id],
      );
      setTagSearch('');
    } catch {
      setTagCreationError("Impossible d'ajouter ce tag.");
    } finally {
      setTagCreationCategoryId(null);
    }
  };

  const handleAnalyzeProviderUrl = () => {
    if (!place) {
      return;
    }

    const rawUrl = place.externalUrl?.trim();
    if (!rawUrl) {
      setError('Colle une URL Google Maps ou Apple Maps avant analyse.');
      return;
    }

    const parsed = parseProviderLink(rawUrl);
    if (!parsed) {
      setError("Impossible de reconnaitre ce lien. Utilise une URL Apple Maps ou Google Maps.");
      return;
    }

    setError('');
    setPlace({
      ...place,
      externalProvider: parsed.provider,
      externalProviderId: parsed.providerId,
      providerLatitude: parsed.providerLatitude,
      providerLongitude: parsed.providerLongitude,
    });
    setShowModerationAdvanced(true);
  };

  const handleSubmit = async () => {
    if (!place) {
      return;
    }

    const mediaError = getMediaUploadErrorMessage([
      ...(coverFile ? [coverFile] : []),
      ...galleryFiles,
    ]);
    if (mediaError) {
      setError(mediaError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', place.name);
      formData.append('description', place.description ?? '');
      formData.append('address', place.address ?? '');
      formData.append('priceLevel', String(Number(place.priceLevel || 1)));
      formData.append('moderationStatus', place.moderationStatus || 'PENDING');
      formData.append('externalProvider', place.externalProvider?.trim() || '');
      formData.append(
        'externalProviderId',
        place.externalProviderId?.trim() || '',
      );
      formData.append('externalUrl', place.externalUrl?.trim() || '');
      if (typeof place.providerLatitude === 'number') {
        formData.append('providerLatitude', String(place.providerLatitude));
      }
      if (typeof place.providerLongitude === 'number') {
        formData.append('providerLongitude', String(place.providerLongitude));
      }
      if (typeof place.providerMatchConfidence === 'number') {
        formData.append(
          'providerMatchConfidence',
          String(place.providerMatchConfidence),
        );
      }
      if (place.latitude !== null && place.latitude !== undefined) {
        formData.append('latitude', String(place.latitude));
      }
      if (place.longitude !== null && place.longitude !== undefined) {
        formData.append('longitude', String(place.longitude));
      }
      if (place.City?.id) {
        formData.append('cityId', String(place.City.id));
      }
      formData.append('tagIds', JSON.stringify(selectedTagIds));
      formData.append('existingImages', JSON.stringify(galleryImages));

      if (coverFile) {
        formData.append('cover', coverFile);
      }
      if (galleryFiles.length > 0) {
        galleryFiles.forEach((file) => formData.append('gallery', file));
      }

      if (isCreateMode) {
        const created = await apiUpload<PlaceDetails>('/places', formData, 'POST');
        navigate(`/places/${created.id}`);
        return;
      }

      await apiUpload(`/places/${place.id}`, formData, 'PATCH');
      navigate('/places');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de sauvegarder le lieu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!place || isCreateMode) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer le lieu "${place.name}" ? Cette action est irreversible.`,
    );
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await apiDelete(`/places/${place.id}`);
      navigate('/places');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer le lieu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !place) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lieu"
        title={isCreateMode ? 'Creer un lieu' : `Modifier ${place.name}`}
        subtitle={
          isCreateMode
            ? 'Ajoute un nouveau lieu au catalogue.'
            : `Ville: ${place.City?.name || 'Non definie'}`
        }
        actions={
          <>
            {!isCreateMode ? (
              <button
                onClick={() => navigate(`/places/view/${place.id}`)}
                className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Voir la fiche
              </button>
            ) : null}
            {!isCreateMode ? (
              <button
                onClick={() => void handleDelete()}
                disabled={saving}
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                Supprimer
              </button>
            ) : null}
            {!isCreateMode ? (
              <button
                onClick={() => navigate(`/places/new?duplicateFrom=${place.id}`)}
                className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
              >
                Dupliquer
              </button>
            ) : null}
            <button
              onClick={() => navigate('/places')}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Retour
            </button>
          </>
        }
      />

      <SectionCard>
        <SectionTitle label="Informations" subtitle="Modifie les infos du lieu." />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormField label="Nom">
              <input
                value={place.name}
                onChange={(evt) => setPlace({ ...place, name: evt.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="Adresse">
              <input
                value={place.address ?? ''}
                onChange={(evt) => setPlace({ ...place, address: evt.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              />
            </FormField>
          </div>
          <FormField label="Ville">
            <CitySelector
              value={place.City ?? null}
              cities={cities}
              onChange={(city) => setPlace({ ...place, City: city })}
              onCreate={handleCreateCity}
            />
          </FormField>
          <FormField label="Niveau de prix">
            <input
              type="number"
              value={place.priceLevel ?? 1}
              onChange={(evt) =>
                setPlace({
                  ...place,
                  priceLevel: Number(evt.target.value || 1),
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
          <FormField label="Latitude">
            <input
              type="number"
              value={place.latitude ?? ''}
              onChange={(evt) =>
                setPlace({
                  ...place,
                  latitude: evt.target.value ? Number(evt.target.value) : null,
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
          <FormField label="Longitude">
            <input
              type="number"
              value={place.longitude ?? ''}
              onChange={(evt) =>
                setPlace({
                  ...place,
                  longitude: evt.target.value ? Number(evt.target.value) : null,
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
        </div>

        <div className="mt-4">
          <FormField label="Description">
            <textarea
              rows={4}
              value={place.description ?? ''}
              onChange={(evt) => setPlace({ ...place, description: evt.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle
          label="Moderation"
          subtitle="Colle une URL Google Maps ou Apple Maps, puis laisse le formulaire remplir le reste."
        />
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <FormField label="URL provider externe">
              <input
                value={place.externalUrl ?? ''}
                onChange={(evt) =>
                  setPlace({
                    ...place,
                    externalUrl: evt.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                placeholder="Colle ici une URL Apple Maps ou Google Maps"
              />
            </FormField>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleAnalyzeProviderUrl}
                className="h-12 rounded-xl border border-brand-200 bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Analyser l'URL
              </button>
              <button
                type="button"
                onClick={() => setShowModerationAdvanced((current) => !current)}
                className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                {showModerationAdvanced ? 'Masquer les champs avancés' : 'Champs avancés'}
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Provider detecte
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {formatProviderLabel(place.externalProvider)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Provider ID
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-slate-700">
                {place.externalProviderId || '-'}
              </p>
            </div>
          </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Coordonnees internes
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {typeof place.latitude === 'number' && typeof place.longitude === 'number'
                    ? `${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}`
                    : '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Coordonnees provider
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {typeof place.providerLatitude === 'number' &&
                  typeof place.providerLongitude === 'number'
                    ? `${place.providerLatitude.toFixed(6)}, ${place.providerLongitude.toFixed(6)}`
                    : '-'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Ecart entre les points
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                {formatDistanceLabel(
                  computeDistanceMeters(
                    place.latitude,
                    place.longitude,
                    place.providerLatitude,
                    place.providerLongitude,
                  ),
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {getDistanceVerdict(
                  computeDistanceMeters(
                    place.latitude,
                    place.longitude,
                    place.providerLatitude,
                    place.providerLongitude,
                  ),
                )}
              </p>
            </div>

          <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
            Le lieu interne reste la source de vérité. Cette URL sert uniquement à le rattacher
            a Google Maps ou Apple Maps.
          </div>

          {showModerationAdvanced ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Statut de moderation">
                <SelectField
                  value={place.moderationStatus || 'PENDING'}
                  onChange={(value) =>
                    setPlace({ ...place, moderationStatus: value || 'PENDING' })
                  }
                  options={[
                    { label: 'En attente', value: 'PENDING' },
                    { label: 'Verifie', value: 'VERIFIED' },
                    { label: 'A revoir', value: 'NEEDS_REVIEW' },
                    { label: 'Refuse', value: 'REJECTED' },
                  ]}
                />
              </FormField>
              <FormField label="Latitude provider">
                <input
                  type="number"
                  step="0.000001"
                  value={place.providerLatitude ?? ''}
                  onChange={(evt) =>
                    setPlace({
                      ...place,
                      providerLatitude: evt.target.value ? Number(evt.target.value) : null,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                />
              </FormField>
              <FormField label="Longitude provider">
                <input
                  type="number"
                  step="0.000001"
                  value={place.providerLongitude ?? ''}
                  onChange={(evt) =>
                    setPlace({
                      ...place,
                      providerLongitude: evt.target.value ? Number(evt.target.value) : null,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                />
              </FormField>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle label="Tags" subtitle="Associe les tags utilises." />
        <div className="mt-4 space-y-4">
          {categories.map((category) => (
            <div key={category.id}>
              <p className="text-xs font-semibold text-slate-600">{category.name}</p>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpenCategoryId((current) =>
                      current === category.id ? null : category.id,
                    )
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700"
                >
                  <span>
                    {(category.Tag || []).filter((tag) =>
                      selectedTagIds.includes(tag.id),
                    ).length > 0
                      ? `${(category.Tag || []).filter((tag) =>
                          selectedTagIds.includes(tag.id),
                        ).length} tag(s) selectionne(s)`
                      : 'Selectionner des tags'}
                  </span>
                  <span className="text-slate-400">v</span>
                </button>

                {openCategoryId === category.id ? (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                    <input
                      value={tagSearch}
                      onChange={(event) => setTagSearch(event.target.value)}
                      placeholder="Rechercher un tag"
                      className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    />
                    {(() => {
                      const query = tagSearch.trim().toLowerCase();
                      const availableTags = (category.Tag || []).filter((tag) =>
                        query ? tag.name.toLowerCase().includes(query) : true,
                      );
                      const hasExact = (category.Tag || []).some(
                        (tag) => tag.name.toLowerCase() === query,
                      );
                      const canAdd = query.length >= 2 && !hasExact;
                      return (
                        <div className="grid gap-2">
                          {availableTags.map((tag) => {
                            const active = selectedTagIds.includes(tag.id);
                            return (
                              <label
                                key={tag.id}
                                className="flex items-center gap-2 text-sm text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() =>
                                    setSelectedTagIds((current) =>
                                      active
                                        ? current.filter((id) => id !== tag.id)
                                        : [...current, tag.id],
                                    )
                                  }
                                />
                                <span>{tag.name}</span>
                              </label>
                            );
                          })}

                          {canAdd ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleCreateTag(category.id, tagSearch.trim())
                              }
                              disabled={tagCreationCategoryId === category.id}
                              className="mt-2 rounded-lg border border-brand-500 px-3 py-2 text-xs font-semibold text-brand-600 disabled:opacity-60"
                            >
                              {tagCreationCategoryId === category.id
                                ? 'Ajout...'
                                : `Ajouter "${tagSearch.trim()}"`}
                            </button>
                          ) : null}

                          {tagCreationError ? (
                            <p className="text-xs text-red-500">
                              {tagCreationError}
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(category.Tag || [])
                  .filter((tag) => selectedTagIds.includes(tag.id))
                  .map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-brand-500 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600"
                    >
                      {tag.name}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle label="Medias" subtitle="Gere la couverture et la galerie." />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              Couverture actuelle
            </p>
            {coverPreview || place.coverUrl ? (
              <MediaPreview
                src={coverPreview || resolveImageUrl(place.coverUrl) || ''}
                alt="cover"
                className="mt-2 h-40 w-full rounded-xl object-cover"
                isVideo={coverFile?.type.startsWith('video/')}
                controls={false}
              />
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Pas de couverture
              </div>
            )}
            {coverPreview ? (
              <p className="mt-2 text-xs text-emerald-600">
                Apercu de la nouvelle couverture.
              </p>
            ) : null}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(evt) => setCoverFile(evt.target.files?.[0] || null)}
              className="mt-3 text-sm text-slate-600"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Galerie actuelle</p>
            {galleryPreviews.length > 0 ? (
              <>
                <p className="mt-2 text-xs text-emerald-600">
                  Apercu des nouvelles images.
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {galleryPreviews.map((preview, index) => (
                    <MediaPreview
                      key={preview}
                      src={preview}
                      alt="preview"
                      className="h-24 w-full rounded-lg object-cover"
                      isVideo={galleryFiles[index]?.type.startsWith('video/')}
                      controls={false}
                    />
                  ))}
                </div>
              </>
            ) : null}
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {galleryImages.map((image) => (
                <button
                  key={image}
                  onClick={() =>
                    setGalleryImages((current) =>
                      current.filter((item) => item !== image),
                    )
                  }
                  className="group relative overflow-hidden rounded-lg"
                >
                  <MediaPreview
                    src={resolveImageUrl(image) || image}
                    alt="gallery"
                    className="h-24 w-full rounded-lg object-cover"
                    controls={false}
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    Retirer
                  </span>
                </button>
              ))}
              {galleryImages.length === 0 ? (
                <div className="col-span-1 rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 sm:col-span-3">
                  Aucune image
                </div>
              ) : null}
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(evt) =>
                setGalleryFiles(Array.from(evt.target.files || []))
              }
              className="mt-3 text-sm text-slate-600"
            />
            <p className="mt-2 text-xs text-slate-400">
              Les nouvelles images seront ajoutees a la galerie existante.
            </p>
          </div>
        </div>
      </SectionCard>

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/places')}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {saving
            ? 'Sauvegarde...'
            : isCreateMode
              ? 'Creer le lieu'
              : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}


