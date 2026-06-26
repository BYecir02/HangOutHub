import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ImagesEditor, type ImagesState } from '@/components/common/ImagesEditor';
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
import { useOrganizers } from '@/features/organizers/useOrganizers';
import { useConfirm } from '@/lib/confirm/useConfirm';
import { fromDateTimeLocalValue } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { useCreateEvent } from './useEvents';

interface FormValues {
  title: string;
  startTime: string;
  endTime: string;
  address: string;
  entryFee: number;
  maxTicketsPerUser: number;
  description: string;
}

const DEFAULTS: FormValues = {
  title: '',
  startTime: '',
  endTime: '',
  address: '',
  entryFee: 0,
  maxTicketsPerUser: 1,
  description: '',
};

export function EventCreatePage() {
  useDocumentTitle('Nouvel événement');
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: cities } = useCities();
  const { data: organizers } = useOrganizers();
  const createMutation = useCreateEvent();
  const confirm = useConfirm();

  const [organizerId, setOrganizerId] = useState<string>('');
  const [organizerError, setOrganizerError] = useState(false);
  const [cityId, setCityId] = useState<number | null>(null);
  const [cityError, setCityError] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [imagesState, setImagesState] = useState<ImagesState>({
    coverFile: null,
    keptImages: [],
    newFiles: [],
  });

  const approvedOrganizers = useMemo(
    () =>
      (organizers ?? []).filter(
        (o) => (o.organizer?.status ?? '').toUpperCase() === 'APPROVED',
      ),
    [organizers],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: formDirty },
  } = useForm<FormValues>({ defaultValues: DEFAULTS });

  const dirty =
    formDirty ||
    organizerId !== '' ||
    cityId !== null ||
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
    navigate('/events');
  };

  const onSubmit = handleSubmit((form) => {
    let invalid = false;
    if (!organizerId) {
      setOrganizerError(true);
      invalid = true;
    }
    if (cityId == null) {
      setCityError(true);
      invalid = true;
    }
    const startTime = fromDateTimeLocalValue(form.startTime);
    if (invalid || !startTime) return;

    createMutation.mutate(
      {
        title: form.title,
        startTime,
        organizerId,
        cityId: cityId ?? undefined,
        endTime: fromDateTimeLocalValue(form.endTime),
        address: form.address,
        entryFee: Number(form.entryFee),
        maxTicketsPerUser: Number(form.maxTicketsPerUser),
        description: form.description,
        tagIds: JSON.stringify(selectedTagIds),
        coverFile: imagesState.coverFile ?? undefined,
        galleryFiles: imagesState.newFiles,
      },
      { onSuccess: (event) => navigate(`/events/${event.id}`) },
    );
  });

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux événements
      </button>

      <PageHeader
        title="Nouvel événement"
        description="Crée un événement au nom d'un organisateur."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Titre" htmlFor="title" error={errors.title?.message}>
                <Input id="title" {...register('title', { required: 'Titre requis.' })} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Organisateur"
                  error={organizerError ? 'Organisateur requis.' : undefined}
                >
                  <Select
                    value={organizerId}
                    onChange={(e) => {
                      setOrganizerId(e.target.value);
                      setOrganizerError(false);
                    }}
                  >
                    <option value="">— Choisir un organisateur —</option>
                    {approvedOrganizers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.organizer?.companyName || o.displayName || o.username}
                      </option>
                    ))}
                  </Select>
                </Field>
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Début" htmlFor="startTime" error={errors.startTime?.message}>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    {...register('startTime', { required: 'Date de début requise.' })}
                  />
                </Field>
                <Field label="Fin" htmlFor="endTime">
                  <Input id="endTime" type="datetime-local" {...register('endTime')} />
                </Field>
              </div>

              <Field label="Adresse" htmlFor="address">
                <Input id="address" {...register('address')} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prix d'entrée (F)" htmlFor="entryFee">
                  <Input
                    id="entryFee"
                    type="number"
                    min={0}
                    step="1"
                    {...register('entryFee', { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Billets max / utilisateur" htmlFor="maxTicketsPerUser">
                  <Input
                    id="maxTicketsPerUser"
                    type="number"
                    min={1}
                    max={20}
                    {...register('maxTicketsPerUser', { valueAsNumber: true })}
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

              <Field label="Description" htmlFor="description">
                <Textarea id="description" rows={4} {...register('description')} />
              </Field>

              <Field label="Images">
                <ImagesEditor coverUrl={null} images={[]} onChange={setImagesState} />
              </Field>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={createMutation.isPending}>
                  <Save className="h-4 w-4" />
                  Créer l'événement
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
                  L'événement est attribué à l'
                  <span className="font-medium text-foreground">organisateur choisi</span>.
                </li>
                <li>Seuls les organisateurs <strong>approuvés</strong> sont proposés.</li>
                <li>
                  Les <span className="font-medium text-foreground">types de billets</span>{' '}
                  s'ajoutent ensuite (pas encore dans ce formulaire).
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
