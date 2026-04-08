import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { apiGet, resolveImageUrl } from '../lib/api';
import MediaPreview from '../components/MediaPreview';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

interface PlaceDetail {
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
  avgRating?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  City?: {
    id?: number;
    name?: string | null;
    country?: string | null;
  } | null;
  Owner?: {
    id?: string;
    displayName?: string | null;
    username?: string | null;
  } | null;
  PlaceTag?: Array<{
    Tag?: {
      id: number;
      name: string;
      status?: string | null;
      Category?: {
        id: number;
        name?: string | null;
      } | null;
    } | null;
  }>;
  Event?: Array<{
    id: string;
    title?: string | null;
    startTime?: string | null;
    coverUrl?: string | null;
    entryFee?: number | null;
  }>;
}

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPriceLevel(level?: number | null) {
  if (!level || level < 1) {
    return '-';
  }

  return '$'.repeat(level);
}

function formatProviderSource(value?: string | null) {
  const normalized = (value || '').toUpperCase();
  if (normalized === 'GOOGLE') {
    return 'Google Maps';
  }
  if (normalized === 'APPLE') {
    return 'Apple Maps';
  }
  if (normalized === 'OTHER') {
    return 'Autre';
  }
  return normalized || '-';
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

function formatEventDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function PlaceViewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await apiGet<PlaceDetail>(`/places/${id}`);
        if (isMounted) {
          setPlace(data);
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
  }, [id]);

  const tags = useMemo(
    () => place?.PlaceTag?.map((entry) => entry.Tag?.name).filter(Boolean) || [],
    [place],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          [
            place?.category?.trim(),
            ...(place?.PlaceTag || [])
              .map((entry) => entry.Tag?.Category?.name?.trim())
              .filter((value): value is string => Boolean(value)),
          ].filter((value): value is string => Boolean(value)),
        ),
      ),
    [place],
  );

  const heroImage = resolveImageUrl(place?.coverUrl) || PLACE_PLACEHOLDER;
  const gallery = place?.images?.length
    ? place.images.map((image) => resolveImageUrl(image) || image)
    : [];
  const distanceMeters = computeDistanceMeters(
    place?.latitude,
    place?.longitude,
    place?.providerLatitude,
    place?.providerLongitude,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lieux"
        title="Fiche du lieu"
        subtitle="Consulte les informations publiques et les contenus lies."
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate(`/places/${id}`)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={() => navigate(`/places/new?duplicateFrom=${id}`)}
              className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              Dupliquer
            </button>
            <button
              type="button"
              onClick={() => navigate('/places')}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Retour
            </button>
          </>
        }
      />

      <SectionCard>
        {loading ? (
          <LoadingState />
        ) : !place ? (
          <EmptyState title="Lieu introuvable." />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-3xl border border-slate-100">
                <MediaPreview
                  src={heroImage}
                  alt={place.name}
                  className="h-56 w-full object-cover sm:h-72"
                  controls
                />
              </div>
              <div className="space-y-4">
                <SectionTitle label="Resume" subtitle="Les informations clefs." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Ville
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {place.City?.name || '-'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Categories
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <span
                            key={category}
                            className="rounded-full bg-brand-500/10 px-3 py-1 text-sm font-semibold text-brand-600"
                          >
                            {category}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm font-semibold text-slate-700">-</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Prix
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {formatPriceLevel(place.priceLevel)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Note
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {typeof place.avgRating === 'number' && place.avgRating > 0
                        ? place.avgRating.toFixed(1)
                        : '-'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Maj
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {formatDate(place.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <SectionTitle label="Adresse" />
                  <p className="mt-2 text-sm text-slate-700">
                    {place.address || '-'}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {place.latitude ?? '-'} , {place.longitude ?? '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 p-4">
                <SectionTitle label="Proprietaire" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {place.Owner?.displayName || place.Owner?.username || '-'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <SectionTitle label="Telephone" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {place.phone || '-'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <SectionTitle label="WhatsApp" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {place.whatsapp || '-'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <SectionTitle label="Moderation" />
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Statut
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={place.moderationStatus} />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Provider
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatProviderSource(place.externalProvider)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Provider ID
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-700">
                    {place.externalProviderId || '-'}
                  </p>
                </div>
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
                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Ecart
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatDistanceLabel(distanceMeters)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {getDistanceVerdict(distanceMeters)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Dernier lien
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatDate(place.providerMatchedAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    URL provider
                  </p>
                  {place.externalUrl ? (
                    <a
                      href={place.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block break-all text-sm font-semibold text-brand-600 hover:underline"
                    >
                      Ouvrir la fiche
                    </a>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-slate-700">-</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <SectionTitle label="Description" />
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {place.description || 'Aucune description.'}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <SectionTitle label="Tags" />
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-brand-200 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Aucun tag.</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <SectionTitle label="Horaires" />
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                {place.openingHours || 'Non renseignes.'}
              </p>
            </div>

            {gallery.length > 0 ? (
              <div>
                <SectionTitle label="Galerie" />
                <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {gallery.map((image, index) => (
                    <div
                      key={`${place.id}-gallery-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-100"
                    >
                      <MediaPreview
                        src={image}
                        alt={`${place.name} ${index + 1}`}
                        className="h-40 w-full object-cover"
                        controls={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {place.Event && place.Event.length > 0 ? (
              <div>
                <SectionTitle label="Evenements lies" />
                <div className="mt-3 space-y-3">
                  {place.Event.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center"
                    >
                      <MediaPreview
                        src={resolveImageUrl(event.coverUrl) || PLACE_PLACEHOLDER}
                        alt={event.title || 'Evenement'}
                        className="h-16 w-16 rounded-xl object-cover"
                        controls={false}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {event.title || '-'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatEventDate(event.startTime)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:ml-auto"
                      >
                        Voir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <SectionTitle label="Date de creation" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {formatDate(place.createdAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <SectionTitle label="Derniere mise a jour" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {formatDate(place.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
