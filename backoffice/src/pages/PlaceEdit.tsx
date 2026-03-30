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
import SelectField from '../components/SelectField';
import Card from '../components/Card';

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
  const [error, setError] = useState('');

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
          } else if (duplicateFrom) {
            const source = placeData as DuplicatePlaceSource;
            setPlace(buildCreateDraft(source));
            setGalleryImages([]);
            setSelectedTagIds(
              source.PlaceTag?.map((entry) => entry.Tag?.id || 0).filter(Boolean) ||
                [],
            );
          } else {
            setPlace(placeData);
            setGalleryImages(placeData.images || []);
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
            <SelectField
              value={place.City?.id ?? ''}
              onChange={(value) => {
                const cityId = Number(value || 0);
                const city = cities.find((item) => item.id === cityId) || null;
                setPlace({ ...place, City: city });
              }}
              className="w-full"
              options={[
                { label: 'Selectionner', value: '' },
                ...cities.map((city) => ({
                  label: `${city.name} - ${city.country}`,
                  value: city.id,
                })),
              ]}
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
              <img
                src={coverPreview || resolveImageUrl(place.coverUrl) || ''}
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
                    src={resolveImageUrl(image) || image}
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


