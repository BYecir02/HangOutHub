import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { apiGet, apiUpload } from '../lib/api';

interface CityOption {
  id: number;
  name: string;
  country: string;
}

interface PlaceDetails {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceLevel?: number | null;
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

export default function PlaceEditPage() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
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
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!params.id) {
        return;
      }
      setLoading(true);
      try {
        const [placeData, cityData, categoryData] = await Promise.all([
          apiGet<PlaceDetails>(`/places/${params.id}`),
          apiGet<CityOption[]>('/cities'),
          apiGet<CategoryOption[]>('/categories'),
        ]);

        if (isMounted) {
          setPlace(placeData);
          setCities(cityData);
          setCategories(categoryData);
          setGalleryImages(placeData.images || []);
          setSelectedTagIds(
            placeData.PlaceTag?.map((entry) => entry.Tag?.id || 0).filter(Boolean) ||
              [],
          );
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

    const previewUrls = galleryFiles.map((file) =>
      URL.createObjectURL(file),
    );
    setGalleryPreviews(previewUrls);

    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [galleryFiles]);

  const handleSubmit = async () => {
    if (!place) {
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

      await apiUpload(`/places/${place.id}`, formData, 'PATCH');
      navigate('/places');
    } catch {
      setError('Impossible de sauvegarder le lieu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !place) {
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
              Lieu
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Modifier {place.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ville: {place.City?.name || 'Non definie'}
            </p>
          </div>
          <button
            onClick={() => navigate('/places')}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Retour
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Nom</label>
            <input
              value={place.name}
              onChange={(evt) => setPlace({ ...place, name: evt.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">
              Adresse
            </label>
            <input
              value={place.address ?? ''}
              onChange={(evt) =>
                setPlace({ ...place, address: evt.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Ville</label>
            <select
              value={place.City?.id ?? ''}
              onChange={(evt) => {
                const cityId = Number(evt.target.value || 0);
                const city = cities.find((item) => item.id === cityId) || null;
                setPlace({ ...place, City: city || null });
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            >
              <option value="">Selectionner</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} - {city.country}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Niveau de prix
            </label>
            <input
              type="number"
              value={place.priceLevel ?? 1}
              onChange={(evt) =>
                setPlace({
                  ...place,
                  priceLevel: Number(evt.target.value || 1),
                })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Latitude
            </label>
            <input
              type="number"
              value={place.latitude ?? ''}
              onChange={(evt) =>
                setPlace({
                  ...place,
                  latitude: evt.target.value ? Number(evt.target.value) : null,
                })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Longitude
            </label>
            <input
              type="number"
              value={place.longitude ?? ''}
              onChange={(evt) =>
                setPlace({
                  ...place,
                  longitude: evt.target.value ? Number(evt.target.value) : null,
                })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-600">
            Description
          </label>
          <textarea
            rows={4}
            value={place.description ?? ''}
            onChange={(evt) =>
              setPlace({ ...place, description: evt.target.value })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
          />
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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              Couverture actuelle
            </p>
            {coverPreview || place.coverUrl ? (
              <img
                src={coverPreview || place.coverUrl || ''}
                alt="cover"
                className="mt-2 h-40 w-full rounded-xl object-cover"
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
              accept="image/*"
              onChange={(evt) =>
                setCoverFile(evt.target.files?.[0] || null)
              }
              className="mt-3 text-sm text-slate-600"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">
              Galerie actuelle
            </p>
            {galleryPreviews.length > 0 ? (
              <>
                <p className="mt-2 text-xs text-emerald-600">
                  Apercu des nouvelles images.
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {galleryPreviews.map((preview) => (
                    <img
                      key={preview}
                      src={preview}
                      alt="preview"
                      className="h-24 w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              </>
            ) : null}
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
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
