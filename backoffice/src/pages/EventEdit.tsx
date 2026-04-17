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
import CitySelector, { type CityOption } from '../components/CitySelector';
import SelectField from '../components/SelectField';
import Card from '../components/Card';
import { getMediaUploadErrorMessage } from '../lib/media';

interface EventDetails {
  id: string;
  title: string;
  description?: string | null;
  address?: string | null;
  startTime: string;
  endTime?: string | null;
  entryFee?: number | null;
  cancellationPolicy?: string | null;
  refundPolicy?: string | null;
  coverUrl?: string | null;
  images?: string[];
  placeId?: string | null;
  TicketType?: Array<{
    id?: string;
    name: string;
    description?: string | null;
    price: number;
    quantity: number;
  }>;
  Promotion?: Array<{
    id: string;
    code?: string | null;
    discountType?: 'PERCENT' | 'FIXED' | null;
    discountValue?: number | null;
    maxRedemptions?: number | null;
    endDate?: string | null;
  }>;
  EventTag?: Array<{
    tagId: number;
    Tag?: {
      id: number;
      name: string;
      status?: string | null;
    } | null;
  }>;
  City?: CityOption | null;
  Place?: {
    id: string;
    name?: string | null;
  } | null;
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

interface PlaceOption {
  id: string;
  name?: string | null;
}

interface DuplicateEventSource {
  id: string;
  title: string;
  description?: string | null;
  address?: string | null;
  images?: string[];
  startTime: string;
  endTime?: string | null;
  entryFee?: number | null;
  cancellationPolicy?: string | null;
  refundPolicy?: string | null;
  placeId?: string | null;
  Place?: {
    id: string;
  } | null;
  TicketType?: Array<{
    id?: string;
    name: string;
    description?: string | null;
    price: number;
    quantity: number;
  }>;
  EventTag?: Array<{
    tagId: number;
  }>;
  City?: CityOption | null;
  Promotion?: Array<{
    code?: string | null;
    discountType?: 'PERCENT' | 'FIXED' | null;
    discountValue?: number | null;
    maxRedemptions?: number | null;
    endDate?: string | null;
  }>;
}

function createEmptyEvent(): EventDetails {
  return {
    id: '',
    title: '',
    description: '',
    address: '',
    startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    endTime: null,
    entryFee: 0,
    cancellationPolicy: '',
    refundPolicy: '',
    coverUrl: null,
    images: [],
    placeId: null,
    TicketType: [],
    Promotion: [],
    EventTag: [],
    City: null,
    Place: null,
  };
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().slice(0, 16);
}

export default function EventEditPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isCreateMode = !params.id;
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [ticketTypes, setTicketTypes] = useState<
    Array<{
      id?: string;
      name: string;
      description?: string | null;
      price: number;
      quantity: number;
    }>
  >([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [openCategoryId, setOpenCategoryId] = useState<number | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const [tagCreationError, setTagCreationError] = useState('');
  const [tagCreationCategoryId, setTagCreationCategoryId] = useState<number | null>(
    null,
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [placeId, setPlaceId] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [address, setAddress] = useState('');
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [promoValue, setPromoValue] = useState('');
  const [promoMaxRedemptions, setPromoMaxRedemptions] = useState('');
  const [promoEndsAt, setPromoEndsAt] = useState('');
  const [error, setError] = useState('');

  const buildCreateDraft = (source: DuplicateEventSource): EventDetails => ({
    ...createEmptyEvent(),
    title: source.title ? `${source.title} (copie)` : 'Nouvel evenement',
    description: source.description ?? '',
    address: source.address ?? '',
    startTime: source.startTime,
    endTime: source.endTime ?? null,
    entryFee: source.entryFee ?? 0,
    cancellationPolicy: source.cancellationPolicy ?? '',
    refundPolicy: source.refundPolicy ?? '',
    City: source.City ?? null,
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const duplicateFrom = searchParams.get('duplicateFrom');
        const [data, categoryData, cityData, placeData] = await Promise.all([
          params.id
            ? apiGet<EventDetails>(`/events/${params.id}`)
            : duplicateFrom
              ? apiGet<DuplicateEventSource>(`/events/${duplicateFrom}`)
              : Promise.resolve(createEmptyEvent()),
          apiGet<CategoryOption[]>('/categories'),
          apiGet<CityOption[]>('/cities'),
          apiGet<PlaceOption[]>('/places'),
        ]);
        if (isMounted) {
          if (params.id) {
            setEvent(data as EventDetails);
            const existingEvent = data as EventDetails;
            setGalleryImages(existingEvent.images || []);
            setTicketTypes(
              existingEvent.TicketType?.map((ticket) => ({
                id: ticket.id,
                name: ticket.name,
                description: ticket.description ?? '',
                price: Number(ticket.price || 0),
                quantity: Number(ticket.quantity || 0),
              })) || [],
            );
            setSelectedTagIds(existingEvent.EventTag?.map((item) => item.tagId) || []);
            setPlaceId(existingEvent.placeId || '');
            setSelectedCity(existingEvent.City ?? null);
            setAddress(existingEvent.address ?? '');

            const promo = existingEvent.Promotion?.[0];
            if (promo?.code) {
              setPromoEnabled(true);
              setPromoCode(promo.code);
              setPromoType((promo.discountType as 'PERCENT' | 'FIXED') || 'PERCENT');
              setPromoValue(promo.discountValue ? String(promo.discountValue) : '');
              setPromoMaxRedemptions(
                promo.maxRedemptions ? String(promo.maxRedemptions) : '',
              );
              setPromoEndsAt(promo.endDate ? toDateTimeLocal(promo.endDate) : '');
            } else {
              setPromoEnabled(false);
              setPromoCode('');
              setPromoType('PERCENT');
              setPromoValue('');
              setPromoMaxRedemptions('');
              setPromoEndsAt('');
            }
          } else if (duplicateFrom) {
            const source = data as DuplicateEventSource;
            setEvent(buildCreateDraft(source));
            setGalleryImages(source.images || []);
            setTicketTypes(
              source.TicketType?.map((ticket) => ({
                id: ticket.id,
                name: ticket.name,
                description: ticket.description ?? '',
                price: Number(ticket.price || 0),
                quantity: Number(ticket.quantity || 0),
              })) || [],
            );
            setSelectedTagIds(source.EventTag?.map((item) => item.tagId) || []);
            setPlaceId(source.placeId || source.Place?.id || '');
              setSelectedCity(source.City ?? null);
              setAddress(source.address ?? '');

            const promo = source.Promotion?.[0];
            if (promo?.code) {
              setPromoEnabled(true);
              setPromoCode(promo.code);
              setPromoType((promo.discountType as 'PERCENT' | 'FIXED') || 'PERCENT');
              setPromoValue(promo.discountValue ? String(promo.discountValue) : '');
              setPromoMaxRedemptions(
                promo.maxRedemptions ? String(promo.maxRedemptions) : '',
              );
              setPromoEndsAt(promo.endDate ? toDateTimeLocal(promo.endDate) : '');
            } else {
              setPromoEnabled(false);
              setPromoCode('');
              setPromoType('PERCENT');
              setPromoValue('');
              setPromoMaxRedemptions('');
              setPromoEndsAt('');
            }
          } else {
            setEvent(createEmptyEvent());
            setGalleryImages([]);
            setTicketTypes([]);
            setSelectedTagIds([]);
            setPlaceId('');
            setSelectedCity(null);
            setAddress('');
            setPromoEnabled(false);
            setPromoCode('');
            setPromoType('PERCENT');
            setPromoValue('');
            setPromoMaxRedemptions('');
            setPromoEndsAt('');
          }
          setCategories(categoryData);
          setCities(cityData);
          setPlaces(placeData);
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
    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [coverFile]);

  useEffect(() => {
    if (galleryFiles.length === 0) {
      setGalleryPreviews([]);
      return;
    }
    const urls = galleryFiles.map((file) => URL.createObjectURL(file));
    setGalleryPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
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
          const existing = (category.Tag || []).some(
            (tag) => tag.id === finalTag.id,
          );
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

  const handleSubmit = async () => {
    if (!event) {
      return;
    }

    setError('');
    if (
      ticketTypes.some(
        (ticket) =>
          !ticket.name.trim() ||
          ticket.price < 0 ||
          !Number.isInteger(ticket.quantity) ||
          ticket.quantity <= 0,
      )
    ) {
      setError('Verifie les tarifs: nom, prix et quantite.');
      return;
    }

    if (promoEnabled && !promoCode.trim()) {
      setError('Le code promo est obligatoire quand la promo est active.');
      return;
    }

    if (!event.title.trim()) {
      setError('Le titre de l evenement est obligatoire.');
      return;
    }

    if (!placeId && !selectedCity) {
      setError('Choisis une ville si l evenement n est pas rattache a un lieu.');
      return;
    }

    if (!event.startTime) {
      setError('La date de debut est obligatoire.');
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
    try {
      const formData = new FormData();
      formData.append('title', event.title);
      formData.append('description', event.description ?? '');
      formData.append('address', address.trim());
      formData.append('startTime', event.startTime);
      if (event.endTime) {
        formData.append('endTime', event.endTime);
      }
      formData.append('entryFee', String(Number(event.entryFee || 0)));
      formData.append('cancellationPolicy', event.cancellationPolicy ?? '');
      formData.append('refundPolicy', event.refundPolicy ?? '');
      if (placeId) {
        formData.append('placeId', placeId);
      }

      formData.append('existingCoverUrl', event.coverUrl ?? '');
      formData.append('existingImages', JSON.stringify(galleryImages));
      formData.append('tagIds', JSON.stringify(selectedTagIds));
      formData.append('ticketTypes', JSON.stringify(ticketTypes));

      if (!placeId && selectedCity) {
        formData.append('cityId', String(selectedCity.id));
      }

      if (promoEnabled) {
        formData.append('promoCode', promoCode.trim().toUpperCase());
        formData.append('promoType', promoType);
        if (promoValue) {
          formData.append('promoValue', String(Number(promoValue)));
        }
        if (promoMaxRedemptions) {
          formData.append(
            'promoMaxRedemptions',
            String(Number(promoMaxRedemptions)),
          );
        }
        if (promoEndsAt) {
          formData.append('promoEndsAt', new Date(promoEndsAt).toISOString());
        }
      } else {
        formData.append('promoCode', '');
      }

      if (coverFile) {
        formData.append('cover', coverFile);
      }
      if (galleryFiles.length > 0) {
        galleryFiles.forEach((file) => formData.append('gallery', file));
      }

      if (isCreateMode) {
        const created = await apiUpload<EventDetails>('/events', formData, 'POST');
        navigate(`/events/${created.id}`);
        return;
      }

      await apiUpload(`/events/${event.id}`, formData, 'PATCH');
      navigate('/events');
    } catch {
      setError('Impossible de sauvegarder. Verifie les tarifs ou la promo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || isCreateMode) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer l'evenement "${event.title}" ? Cette action est irreversible.`,
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError('');
    try {
      await apiDelete(`/events/${event.id}`);
      navigate('/events');
    } catch {
      setError("Impossible de supprimer l'evenement.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !event) {
    return (
      <Card>
        <LoadingState />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evenement"
        title={isCreateMode ? 'Creer un evenement' : `Modifier ${event.title}`}
        subtitle={
          isCreateMode
            ? 'Ajoute un nouvel evenement au catalogue.'
            : `Lieu: ${event.Place?.name || 'Non rattache'}`
        }
        actions={
          <>
            {!isCreateMode ? (
              <button
                onClick={() => void handleDelete()}
                disabled={saving || deleting}
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            ) : null}
            {!isCreateMode ? (
              <button
                onClick={() => navigate(`/events/new?duplicateFrom=${event.id}`)}
                className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
              >
                Dupliquer
              </button>
            ) : null}
            <button
              onClick={() => navigate('/events')}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Retour
            </button>
          </>
        }
      />

      <SectionCard>
        <SectionTitle
          label="Informations"
          subtitle="Modifie les informations principales."
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <FormField label="Titre">
              <input
                value={event.title}
                onChange={(evt) =>
                  setEvent({ ...event, title: evt.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              />
            </FormField>
          </div>
          <FormField label="Debut">
            <input
              type="datetime-local"
              value={toDateTimeLocal(event.startTime)}
              onChange={(evt) =>
                setEvent({
                  ...event,
                  startTime: new Date(evt.target.value).toISOString(),
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
          <FormField label="Fin">
            <input
              type="datetime-local"
              value={toDateTimeLocal(event.endTime)}
              onChange={(evt) =>
                setEvent({
                  ...event,
                  endTime: evt.target.value
                    ? new Date(evt.target.value).toISOString()
                    : null,
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
          <FormField label="Prix (FCFA)">
            <input
              type="number"
              value={event.entryFee ?? 0}
              onChange={(evt) =>
                setEvent({
                  ...event,
                  entryFee: Number(evt.target.value || 0),
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
          <FormField label="Lieu rattache">
            <SelectField
              value={placeId}
              onChange={(value) => {
                setPlaceId(value);
              }}
              className="w-full"
              options={[
                { label: 'Aucun', value: '' },
                ...places.map((place) => ({
                  label: place.name || place.id,
                  value: place.id,
                })),
              ]}
            />
          </FormField>
          <FormField label="Adresse">
            <input
              value={address}
              onChange={(evt) => setAddress(evt.target.value)}
              placeholder="Adresse, point de repere ou precisions"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
          {!placeId ? (
            <div className="lg:col-span-2">
              <FormField label="Ville de l evenement">
                <CitySelector
                  value={selectedCity}
                  cities={cities}
                  onChange={setSelectedCity}
                  onCreate={async (payload) => {
                    const created = await apiPost<CityOption>('/cities', payload);
                    setCities((current) =>
                      current.some((city) => city.id === created.id)
                        ? current
                        : [...current, created],
                    );
                    return created;
                  }}
                />
              </FormField>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <FormField label="Description">
            <textarea
              rows={4}
              value={event.description ?? ''}
              onChange={(evt) =>
                setEvent({ ...event, description: evt.target.value })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <FormField label="Politique d'annulation">
            <textarea
              rows={3}
              value={event.cancellationPolicy ?? ''}
              onChange={(evt) =>
                setEvent({
                  ...event,
                  cancellationPolicy: evt.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
          <FormField label="Politique de remboursement">
            <textarea
              rows={3}
              value={event.refundPolicy ?? ''}
              onChange={(evt) =>
                setEvent({
                  ...event,
                  refundPolicy: evt.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-center justify-between">
          <SectionTitle label="Tarifs" subtitle="Definis les options de prix." />
          <button
            onClick={() =>
              setTicketTypes((current) => [
                ...current,
                { name: '', description: '', price: 0, quantity: 1 },
              ])
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            Ajouter un tarif
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {ticketTypes.map((ticket, index) => (
            <div
              key={`${ticket.id || index}`}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-2">
                  <FormField label="Nom">
                    <input
                      value={ticket.name}
                      onChange={(evt) => {
                        const next = [...ticketTypes];
                        next[index] = { ...ticket, name: evt.target.value };
                        setTicketTypes(next);
                      }}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                    />
                  </FormField>
                </div>
                <FormField label="Prix">
                  <input
                    type="number"
                    value={ticket.price}
                    onChange={(evt) => {
                      const next = [...ticketTypes];
                      next[index] = {
                        ...ticket,
                        price: Number(evt.target.value || 0),
                      };
                      setTicketTypes(next);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  />
                </FormField>
                <FormField label="Quantite">
                  <input
                    type="number"
                    value={ticket.quantity}
                    onChange={(evt) => {
                      const next = [...ticketTypes];
                      next[index] = {
                        ...ticket,
                        quantity: Number(evt.target.value || 1),
                      };
                      setTicketTypes(next);
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  />
                </FormField>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                <FormField label="Description">
                  <input
                    value={ticket.description ?? ''}
                    onChange={(evt) => {
                      const next = [...ticketTypes];
                      next[index] = { ...ticket, description: evt.target.value };
                      setTicketTypes(next);
                    }}
                    placeholder="Description (avantages, acces...)"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  />
                </FormField>
                <div className="flex items-end">
                  <button
                    onClick={() =>
                      setTicketTypes((current) =>
                        current.filter((_, idx) => idx !== index),
                      )
                    }
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            </div>
          ))}
          {ticketTypes.length === 0 ? (
            <p className="text-sm text-slate-400">
              Aucun tarif. Le prix principal sera utilise.
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle label="Tags" subtitle="Associe les tags utiles." />
        <div className="mt-4 space-y-4">
          {categories.map((category) => (
            <div key={category.id}>
              <p className="text-xs font-semibold text-slate-600">
                {category.name}
              </p>
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
        <div className="flex items-center justify-between">
          <SectionTitle label="Promo" subtitle="Configure une remise si besoin." />
          <button
            onClick={() => setPromoEnabled((prev) => !prev)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
          >
            {promoEnabled ? 'Desactiver' : 'Activer'}
          </button>
        </div>
        {promoEnabled ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <FormField label="Code">
              <input
                value={promoCode}
                onChange={(evt) => setPromoCode(evt.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
              />
            </FormField>
            <FormField label="Type">
              <SelectField
                value={promoType}
                onChange={(value) => setPromoType(value as 'PERCENT' | 'FIXED')}
                className="w-full"
                options={[
                  { label: '%', value: 'PERCENT' },
                  { label: 'FCFA', value: 'FIXED' },
                ]}
              />
            </FormField>
            <FormField label="Valeur">
              <input
                type="number"
                value={promoValue}
                onChange={(evt) => setPromoValue(evt.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
              />
            </FormField>
            <FormField label="Quota (optionnel)">
              <input
                type="number"
                value={promoMaxRedemptions}
                onChange={(evt) => setPromoMaxRedemptions(evt.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
              />
            </FormField>
            <div className="lg:col-span-2">
              <FormField label="Fin promo">
                <input
                  type="datetime-local"
                  value={promoEndsAt}
                  onChange={(evt) => setPromoEndsAt(evt.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </FormField>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Aucun code promo actif.</p>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle label="Medias" subtitle="Gere la couverture et la galerie." />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              Couverture actuelle
            </p>
            {coverPreview || event.coverUrl ? (
              <MediaPreview
                src={coverPreview || resolveImageUrl(event.coverUrl) || ''}
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
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(evt) => setCoverFile(evt.target.files?.[0] || null)}
              className="mt-3 text-sm text-slate-600"
            />
            {coverPreview ? (
              <p className="mt-2 text-xs text-slate-400">
                Apercu du nouveau cover.
              </p>
            ) : null}
            <button
              onClick={() => setEvent({ ...event, coverUrl: null })}
              className="mt-3 text-xs font-semibold text-red-500"
            >
              Supprimer la couverture
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Galerie actuelle</p>
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
            {galleryPreviews.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {galleryPreviews.map((preview, index) => (
                  <MediaPreview
                    key={preview}
                    src={preview}
                    alt="nouvelle"
                    className="h-20 w-full rounded-lg object-cover"
                    isVideo={galleryFiles[index]?.type.startsWith('video/')}
                    controls={false}
                  />
                ))}
              </div>
            ) : null}
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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={() => navigate('/events')}
          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 sm:w-auto"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 sm:w-auto"
        >
          {saving
            ? 'Sauvegarde...'
            : isCreateMode
              ? 'Creer l evenement'
              : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}

