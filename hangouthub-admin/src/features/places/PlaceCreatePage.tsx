import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ImagesEditor, type ImagesState } from '@/components/common/ImagesEditor';
import { OpeningHoursEditor } from '@/components/common/OpeningHoursEditor';
import { TagPicker } from '@/components/common/TagPicker';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { useCategories } from '@/features/categories/useCategories';
import { useCities } from '@/features/cities/useCities';
import { useConfirm } from '@/lib/confirm/useConfirm';
import type { WeeklyHours } from '@/lib/opening-hours';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { useCreatePlace } from './usePlaces';

interface FormValues {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  description: string;
  phone: string;
  whatsapp: string;
  priceLevel: number;
  moderationStatus: string;
}

const DEFAULTS: FormValues = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  description: '',
  phone: '',
  whatsapp: '',
  priceLevel: 1,
  moderationStatus: 'APPROVED',
};

export function PlaceCreatePage() {
  useDocumentTitle('Nouveau lieu');
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: cities } = useCities();
  const createMutation = useCreatePlace();
  const confirm = useConfirm();

  const [cityId, setCityId] = useState<number | null>(null);
  const [cityError, setCityError] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [hours, setHours] = useState<WeeklyHours>({});
  const [sameWhatsapp, setSameWhatsapp] = useState(false);
  const [imagesState, setImagesState] = useState<ImagesState>({
    coverFile: null,
    keptImages: [],
    newFiles: [],
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: formDirty },
  } = useForm<FormValues>({ defaultValues: DEFAULTS });

  const dirty =
    formDirty ||
    cityId !== null ||
    selectedCategoryId !== null ||
    selectedTagIds.length > 0 ||
    imagesState.coverFile !== null ||
    imagesState.newFiles.length > 0;
  useUnsavedChanges(dirty);

  const handleBack = async () => {
    if (
      dirty &&
      !(await confirm({
        title: 'Quitter sans enregistrer ?',
        description: 'Les informations saisies seront perdues.',
        confirmLabel: 'Quitter',
        variant: 'destructive',
      }))
    ) {
      return;
    }
    navigate('/places');
  };

  const onSubmit = handleSubmit((form) => {
    if (cityId == null) {
      setCityError(true);
      return;
    }
    const categoryName = categories?.find((c) => c.id === selectedCategoryId)?.name;
    createMutation.mutate(
      {
        name: form.name,
        address: form.address,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        cityId,
        category: categoryName,
        description: form.description,
        phone: form.phone,
        whatsapp: sameWhatsapp ? form.phone : form.whatsapp,
        priceLevel: Number(form.priceLevel),
        moderationStatus: form.moderationStatus,
        tagIds: JSON.stringify(selectedTagIds),
        openingHoursStructured: JSON.stringify(hours),
        coverFile: imagesState.coverFile ?? undefined,
        galleryFiles: imagesState.newFiles,
      },
      { onSuccess: (place) => navigate(`/places/${place.id}`) },
    );
  });

  const numberValidate = (v: string) =>
    (v.trim() !== '' && !Number.isNaN(Number(v))) || 'Nombre invalide.';

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

      <PageHeader
        title="Nouveau lieu"
        description="Le lieu créé restera non revendiqué : un gérant pourra le réclamer ensuite."
      />

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

              <Field label="Adresse" htmlFor="address" error={errors.address?.message}>
                <Input id="address" {...register('address', { required: 'Adresse requise.' })} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ville" error={cityError ? 'Ville requise.' : undefined}>
                  <Select
                    value={cityId ?? ''}
                    onChange={(e) => {
                      setCityId(e.target.value ? Number(e.target.value) : null);
                      setCityError(false);
                    }}
                  >
                    <option value="">— Choisir une ville —</option>
                    {cities?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Catégorie (principale)">
                  <Select
                    value={selectedCategoryId ?? ''}
                    onChange={(e) =>
                      setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)
                    }
                  >
                    <option value="">— Aucune —</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Latitude" htmlFor="latitude" error={errors.latitude?.message}>
                  <Input
                    id="latitude"
                    placeholder="6.3610"
                    {...register('latitude', {
                      required: 'Latitude requise.',
                      validate: numberValidate,
                    })}
                  />
                </Field>
                <Field label="Longitude" htmlFor="longitude" error={errors.longitude?.message}>
                  <Input
                    id="longitude"
                    placeholder="2.0840"
                    {...register('longitude', {
                      required: 'Longitude requise.',
                      validate: numberValidate,
                    })}
                  />
                </Field>
              </div>

              <Field label="Tags">
                <TagPicker
                  categories={categories}
                  value={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
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

              <Field label="Niveau de prix" htmlFor="priceLevel">
                <Select id="priceLevel" {...register('priceLevel', { valueAsNumber: true })}>
                  <option value={1}>€ — Économique</option>
                  <option value={2}>€€ — Modéré</option>
                  <option value={3}>€€€ — Élevé</option>
                  <option value={4}>€€€€ — Premium</option>
                </Select>
              </Field>

              <Field label="Horaires">
                <OpeningHoursEditor value={hours} onChange={setHours} />
              </Field>

              <Field label="Description" htmlFor="description">
                <Textarea id="description" rows={4} {...register('description')} />
              </Field>

              <Field label="Images">
                <ImagesEditor coverUrl={null} images={[]} onChange={setImagesState} />
              </Field>

              <Field label="Statut de modération" htmlFor="moderationStatus">
                <Select id="moderationStatus" {...register('moderationStatus')}>
                  <option value="PENDING">En attente</option>
                  <option value="APPROVED">Approuvé</option>
                  <option value="REJECTED">Rejeté</option>
                </Select>
              </Field>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={createMutation.isPending}>
                  <Save className="h-4 w-4" />
                  Créer le lieu
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">À savoir</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-4">
                <li>
                  Le lieu sera <span className="font-medium text-foreground">non revendiqué</span> :
                  un gérant pourra le réclamer.
                </li>
                <li>
                  Récupère <span className="font-medium text-foreground">latitude/longitude</span> sur
                  Google Maps (clic droit sur le point → coordonnées).
                </li>
                <li>Tu peux le passer direct en « Approuvé ».</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
