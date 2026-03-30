import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { apiGet, resolveImageUrl } from '../lib/api';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

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

  const heroImage = resolveImageUrl(place?.coverUrl) || PLACE_PLACEHOLDER;
  const gallery = place?.images?.length
    ? place.images.map((image) => resolveImageUrl(image) || image)
    : [];

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
                <img
                  src={heroImage}
                  alt={place.name}
                  className="h-72 w-full object-cover"
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

            <div className="grid gap-4 md:grid-cols-3">
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {gallery.map((image, index) => (
                    <div
                      key={`${place.id}-gallery-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-100"
                    >
                      <img
                        src={image}
                        alt={`${place.name} ${index + 1}`}
                        className="h-40 w-full object-cover"
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
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4"
                    >
                      <img
                        src={resolveImageUrl(event.coverUrl) || PLACE_PLACEHOLDER}
                        alt={event.title || 'Evenement'}
                        className="h-16 w-16 rounded-xl object-cover"
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
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
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
