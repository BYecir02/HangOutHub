import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Check, Save, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Select,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { ImagesEditor, type ImagesState } from '@/components/common/ImagesEditor';
import { OpeningHoursEditor } from '@/components/common/OpeningHoursEditor';
import { TagPicker } from '@/components/common/TagPicker';
import { useCategories } from '@/features/categories/useCategories';
import { useConfirm } from '@/lib/confirm/useConfirm';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { formatDateTime } from '@/lib/format';
import type { WeeklyHours } from '@/lib/opening-hours';
import { useDeletePlace, usePlace, useUpdatePlace } from './usePlaces';

interface PlaceFormValues {
  name: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  priceLevel: number;
  moderationStatus: string;
}

const DEFAULTS: PlaceFormValues = {
  name: '',
  description: '',
  address: '',
  phone: '',
  whatsapp: '',
  priceLevel: 1,
  moderationStatus: 'PENDING',
};

export function PlaceDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: place, isLoading, isError, refetch } = usePlace(id);
  const { data: categories } = useCategories();
  const updateMutation = useUpdatePlace();
  const deleteMutation = useDeletePlace();
  const confirm = useConfirm();
  useDocumentTitle(place?.name ?? 'Lieu');

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [sameWhatsapp, setSameWhatsapp] = useState(false);
  const [hours, setHours] = useState<WeeklyHours>({});
  const [imagesState, setImagesState] = useState<ImagesState>({
    coverFile: null,
    keptImages: [],
    newFiles: [],
  });

  const values = useMemo<PlaceFormValues | undefined>(
    () =>
      place
        ? {
            name: place.name ?? '',
            description: place.description ?? '',
            address: place.address ?? '',
            phone: place.phone ?? '',
            whatsapp: place.whatsapp ?? '',
            priceLevel: place.priceLevel ?? 1,
            moderationStatus: (place.moderationStatus ?? 'PENDING').toUpperCase(),
          }
        : undefined,
    [place],
  );

  // Initialise tags + catégorie à partir du lieu chargé.
  useEffect(() => {
    if (!place) return;
    const placeTags = place.PlaceTag ?? [];
    setSelectedTagIds(placeTags.map((pt) => pt.tagId));
    const categoryFromTag = placeTags[0]?.Tag?.categoryId ?? null;
    setSelectedCategoryId(categoryFromTag);
    // Coché si le WhatsApp est déjà identique au téléphone.
    setSameWhatsapp(Boolean(place.phone) && place.phone === place.whatsapp);
    setHours(place.openingHoursStructured ?? {});
  }, [place]);

  // Si pas de catégorie déduite des tags, on tente de matcher par nom.
  useEffect(() => {
    if (selectedCategoryId != null || !place?.category || !categories) return;
    const match = categories.find(
      (c) => c.name.toLowerCase() === place.category!.toLowerCase(),
    );
    if (match) setSelectedCategoryId(match.id);
  }, [categories, place?.category, selectedCategoryId]);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: formDirty },
  } = useForm<PlaceFormValues>({ defaultValues: DEFAULTS, values });

  const dirty =
    formDirty ||
    imagesState.coverFile !== null ||
    imagesState.newFiles.length > 0;
  useUnsavedChanges(dirty);

  const handleBack = async () => {
    if (
      dirty &&
      !(await confirm({
        title: 'Quitter sans enregistrer ?',
        description: 'Les modifications non enregistrées seront perdues.',
        confirmLabel: 'Quitter',
        variant: 'destructive',
      }))
    ) {
      return;
    }
    navigate('/places');
  };

  if (isLoading) return <LoadingState />;
  if (isError || !place) {
    return <ErrorState message="Lieu introuvable." onRetry={() => void refetch()} />;
  }

  const handleCategoryChange = (raw: string) => {
    setSelectedCategoryId(raw ? Number(raw) : null);
  };

  const onSubmit = handleSubmit((form) => {
    const categoryName = categories?.find((c) => c.id === selectedCategoryId)?.name;
    updateMutation.mutate({
      id,
      payload: {
        ...form,
        // Si "même numéro" est coché, le WhatsApp recopie le téléphone.
        whatsapp: sameWhatsapp ? form.phone : form.whatsapp,
        priceLevel: Number(form.priceLevel),
        category: categoryName,
        tagIds: JSON.stringify(selectedTagIds),
        openingHoursStructured: JSON.stringify(hours),
        existingImages: JSON.stringify(imagesState.keptImages),
        coverFile: imagesState.coverFile ?? undefined,
        galleryFiles: imagesState.newFiles,
      },
    });
  });

  const moderate = (moderationStatus: string) => {
    updateMutation.mutate({ id, payload: { moderationStatus } });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Supprimer « ${place.name} » ?`,
      description: 'Action irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate(id, { onSuccess: () => navigate('/places') });
  };

  const currentTags = (place.PlaceTag ?? [])
    .map((pt) => pt.Tag?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux lieux
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{place.name}</h1>
          <StatusBadge status={place.moderationStatus} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="success" disabled={updateMutation.isPending} onClick={() => moderate('APPROVED')}>
            <Check className="h-4 w-4" />
            Approuver
          </Button>
          <Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => moderate('REJECTED')}>
            <X className="h-4 w-4" />
            Rejeter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            loading={deleteMutation.isPending}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Nom" htmlFor="name" error={errors.name?.message}>
                <Input id="name" {...register('name', { required: 'Nom requis.' })} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Catégorie (principale)" htmlFor="category">
                  <Select
                    id="category"
                    value={selectedCategoryId ?? ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    <option value="">— Aucune —</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Niveau de prix" htmlFor="priceLevel">
                  <Select id="priceLevel" {...register('priceLevel', { valueAsNumber: true })}>
                    <option value={1}>€ — Économique</option>
                    <option value={2}>€€ — Modéré</option>
                    <option value={3}>€€€ — Élevé</option>
                    <option value={4}>€€€€ — Premium</option>
                  </Select>
                </Field>
              </div>

              <Field label="Tags">
                <TagPicker
                  categories={categories}
                  value={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </Field>

              <Field label="Adresse" htmlFor="address">
                <Input id="address" {...register('address')} />
              </Field>

              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Téléphone" htmlFor="phone">
                    <Input id="phone" {...register('phone')} />
                  </Field>
                  {!sameWhatsapp && (
                    <Field label="WhatsApp" htmlFor="whatsapp">
                      <Input id="whatsapp" {...register('whatsapp')} />
                    </Field>
                  )}
                </div>
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={sameWhatsapp}
                    onChange={(e) => setSameWhatsapp(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Le numéro WhatsApp est le même que le téléphone
                </label>
              </div>

              <Field label="Horaires">
                <OpeningHoursEditor value={hours} onChange={setHours} />
              </Field>

              <Field label="Description" htmlFor="description">
                <Textarea id="description" rows={4} {...register('description')} />
              </Field>

              <Field label="Images">
                <ImagesEditor
                  resetKey={place.id}
                  coverUrl={place.coverUrl}
                  images={place.images}
                  onChange={setImagesState}
                />
              </Field>

              <Field label="Statut de modération" htmlFor="moderationStatus">
                <Select id="moderationStatus" {...register('moderationStatus')}>
                  <option value="PENDING">En attente</option>
                  <option value="APPROVED">Approuvé</option>
                  <option value="REJECTED">Rejeté</option>
                </Select>
              </Field>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={updateMutation.isPending}>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tags actuels</CardTitle>
            </CardHeader>
            <CardContent>
              {currentTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {currentTags.map((name) => (
                    <Badge key={name} tone="primary">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun tag.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métadonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <MetaRow label="Propriétaire">
                {place.Owner ? (
                  <div className="flex items-center gap-2">
                    <Avatar src={place.Owner.avatarUrl} name={place.Owner.username} className="h-6 w-6" />
                    <span>{place.Owner.displayName || place.Owner.username}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Non revendiqué</span>
                )}
              </MetaRow>
              <MetaRow label="Ville">{place.City?.name || '—'}</MetaRow>
              <MetaRow label="Note moyenne">
                {place.avgRating ? `★ ${place.avgRating.toFixed(1)}` : '—'}
              </MetaRow>
              <MetaRow label="Vues">{place.viewCount ?? 0}</MetaRow>
              <MetaRow label="Coordonnées">
                {place.latitude != null && place.longitude != null
                  ? `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`
                  : '—'}
              </MetaRow>
              <MetaRow label="Créé le">{formatDateTime(place.createdAt)}</MetaRow>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
