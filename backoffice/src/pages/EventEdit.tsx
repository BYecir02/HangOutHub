import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { apiGet, apiUpload } from '../lib/api';

interface EventDetails {
  id: string;
  title: string;
  description?: string | null;
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
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [placeId, setPlaceId] = useState<string>('');
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [promoValue, setPromoValue] = useState('');
  const [promoMaxRedemptions, setPromoMaxRedemptions] = useState('');
  const [promoEndsAt, setPromoEndsAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!params.id) {
        return;
      }
      setLoading(true);
      try {
        const [data, categoryData, placeData] = await Promise.all([
          apiGet<EventDetails>(`/events/${params.id}`),
          apiGet<CategoryOption[]>('/categories'),
          apiGet<PlaceOption[]>('/places'),
        ]);
        if (isMounted) {
          setEvent(data);
          setCategories(categoryData);
          setPlaces(placeData);
          setGalleryImages(data.images || []);
          setTicketTypes(
            data.TicketType?.map((ticket) => ({
              id: ticket.id,
              name: ticket.name,
              description: ticket.description ?? '',
              price: Number(ticket.price || 0),
              quantity: Number(ticket.quantity || 0),
            })) || [],
          );
          setSelectedTagIds(
            data.EventTag?.map((item) => item.tagId) || [],
          );
          setPlaceId(data.placeId || data.Place?.id || '');

          const promo = data.Promotion?.[0];
          if (promo?.code) {
            setPromoEnabled(true);
            setPromoCode(promo.code);
            setPromoType((promo.discountType as 'PERCENT' | 'FIXED') || 'PERCENT');
            setPromoValue(promo.discountValue ? String(promo.discountValue) : '');
            setPromoMaxRedemptions(
              promo.maxRedemptions ? String(promo.maxRedemptions) : '',
            );
            setPromoEndsAt(promo.endDate ? toDateTimeLocal(promo.endDate) : '');
          }
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
  }, [params.id]);

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

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', event.title);
      formData.append('description', event.description ?? '');
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

      if (promoEnabled) {
        formData.append('promoCode', promoCode.trim().toUpperCase());
        formData.append('promoType', promoType);
        if (promoValue) {
          formData.append('promoValue', String(Number(promoValue)));
        }
        if (promoMaxRedemptions) {
          formData.append('promoMaxRedemptions', String(Number(promoMaxRedemptions)));
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

      await apiUpload(`/events/${event.id}`, formData, 'PATCH');
      navigate('/events');
    } catch {
      setError(
        'Impossible de sauvegarder. Verifie les tarifs ou la promo.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <p className="text-sm text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Evenement
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Modifier {event.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Lieu: {event.Place?.name || 'Non rattache'}
            </p>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Retour
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Titre</label>
            <input
              value={event.title}
              onChange={(evt) =>
                setEvent({ ...event, title: evt.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Debut</label>
            <input
              type="datetime-local"
              value={toDateTimeLocal(event.startTime)}
              onChange={(evt) =>
                setEvent({
                  ...event,
                  startTime: new Date(evt.target.value).toISOString(),
                })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Fin</label>
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
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Prix (FCFA)
            </label>
            <input
              type="number"
              value={event.entryFee ?? 0}
              onChange={(evt) =>
                setEvent({
                  ...event,
                  entryFee: Number(evt.target.value || 0),
                })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">
              Lieu rattache
            </label>
            <select
              value={placeId}
              onChange={(evt) => setPlaceId(evt.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            >
              <option value="">Aucun</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name || place.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-600">
            Description
          </label>
          <textarea
            rows={4}
            value={event.description ?? ''}
            onChange={(evt) =>
              setEvent({ ...event, description: evt.target.value })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Politique d annulation
            </label>
            <textarea
              rows={3}
              value={event.cancellationPolicy ?? ''}
              onChange={(evt) =>
                setEvent({
                  ...event,
                  cancellationPolicy: evt.target.value,
                })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Politique de remboursement
            </label>
            <textarea
              rows={3}
              value={event.refundPolicy ?? ''}
              onChange={(evt) =>
                setEvent({
                  ...event,
                  refundPolicy: evt.target.value,
                })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Tarifs
            </p>
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
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Nom
                    </label>
                    <input
                      value={ticket.name}
                      onChange={(evt) => {
                        const next = [...ticketTypes];
                        next[index] = { ...ticket, name: evt.target.value };
                        setTicketTypes(next);
                      }}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Prix
                    </label>
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
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Quantite
                    </label>
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
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    value={ticket.description ?? ''}
                    onChange={(evt) => {
                      const next = [...ticketTypes];
                      next[index] = { ...ticket, description: evt.target.value };
                      setTicketTypes(next);
                    }}
                    placeholder="Description (avantages, acces...)"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  />
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
            ))}
            {ticketTypes.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aucun tarif. Le prix principal sera utilise.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
            Tags
          </p>
          <div className="mt-3 space-y-4">
            {categories.map((category) => (
              <div key={category.id}>
                <p className="text-xs font-semibold text-slate-600">
                  {category.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(category.Tag || []).map((tag) => {
                    const active = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setSelectedTagIds((current) =>
                            active
                              ? current.filter((id) => id !== tag.id)
                              : [...current, tag.id],
                          );
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          active
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Promo</p>
            <button
              onClick={() => setPromoEnabled((prev) => !prev)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
            >
              {promoEnabled ? 'Desactiver' : 'Activer'}
            </button>
          </div>
          {promoEnabled ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Code
                </label>
                <input
                  value={promoCode}
                  onChange={(evt) => setPromoCode(evt.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Type
                </label>
                <select
                  value={promoType}
                  onChange={(evt) =>
                    setPromoType(evt.target.value as 'PERCENT' | 'FIXED')
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                >
                  <option value="PERCENT">%</option>
                  <option value="FIXED">FCFA</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Valeur
                </label>
                <input
                  type="number"
                  value={promoValue}
                  onChange={(evt) => setPromoValue(evt.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Quota (optionnel)
                </label>
                <input
                  type="number"
                  value={promoMaxRedemptions}
                  onChange={(evt) => setPromoMaxRedemptions(evt.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">
                  Fin promo
                </label>
                <input
                  type="datetime-local"
                  value={promoEndsAt}
                  onChange={(evt) => setPromoEndsAt(evt.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Aucun code promo actif.
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              Couverture actuelle
            </p>
            {coverPreview || event.coverUrl ? (
              <img
                src={coverPreview || event.coverUrl || ''}
                alt="cover"
                className="mt-2 h-40 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Pas de couverture
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(evt) =>
                setCoverFile(evt.target.files?.[0] || null)
              }
              className="mt-3 text-sm text-slate-600"
            />
            {coverPreview ? (
              <p className="mt-2 text-xs text-slate-400">
                Apercu du nouveau cover.
              </p>
            ) : null}
            <button
              onClick={() =>
                setEvent({ ...event, coverUrl: null })
              }
              className="mt-3 text-xs font-semibold text-red-500"
            >
              Supprimer la couverture
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">
              Galerie actuelle
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
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
                  <img
                    src={image}
                    alt="gallery"
                    className="h-24 w-full rounded-lg object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    Retirer
                  </span>
                </button>
              ))}
              {galleryImages.length === 0 ? (
                <div className="col-span-3 rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  Aucune image
                </div>
              ) : null}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(evt) =>
                setGalleryFiles(Array.from(evt.target.files || []))
              }
              className="mt-3 text-sm text-slate-600"
            />
            {galleryPreviews.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {galleryPreviews.map((preview) => (
                  <img
                    key={preview}
                    src={preview}
                    alt="nouvelle"
                    className="h-20 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-slate-400">
              Les nouvelles images seront ajoutees a la galerie existante.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => navigate('/events')}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
