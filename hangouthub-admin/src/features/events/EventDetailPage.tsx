import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, History, Save, Ticket, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Textarea,
} from '@/components/ui';
import { ImagesEditor, type ImagesState } from '@/components/common/ImagesEditor';
import { TagPicker } from '@/components/common/TagPicker';
import { useCategories } from '@/features/categories/useCategories';
import { useConfirm } from '@/lib/confirm/useConfirm';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import {
  formatDateTime,
  formatRelative,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from '@/lib/format';
import {
  useDeleteEvent,
  useEvent,
  useEventRevisions,
  useUpdateEvent,
} from './useEvents';

interface EventFormValues {
  title: string;
  description: string;
  address: string;
  startTime: string;
  endTime: string;
  entryFee: number;
  maxTicketsPerUser: number;
}

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  COLLABORATOR_UPSERT: 'Collaborateur ajouté/màj',
  COLLABORATOR_REMOVE: 'Collaborateur retiré',
};

export function EventDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, isError, refetch } = useEvent(id);
  const { data: revisions } = useEventRevisions(id);
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const confirm = useConfirm();
  useDocumentTitle(event?.title ?? 'Événement');
  const { data: categories } = useCategories();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [imagesState, setImagesState] = useState<ImagesState>({
    coverFile: null,
    keptImages: [],
    newFiles: [],
  });

  useEffect(() => {
    if (!event) return;
    setSelectedTagIds((event.EventTag ?? []).map((et) => et.tagId));
  }, [event]);

  const values = useMemo<EventFormValues | undefined>(
    () =>
      event
        ? {
            title: event.title ?? '',
            description: event.description ?? '',
            address: event.address ?? '',
            startTime: toDateTimeLocalValue(event.startTime),
            endTime: toDateTimeLocalValue(event.endTime),
            entryFee: Number(event.entryFee ?? 0),
            maxTicketsPerUser: event.maxTicketsPerUser ?? 1,
          }
        : undefined,
    [event],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: formDirty },
  } = useForm<EventFormValues>({
    defaultValues: {
      title: '',
      description: '',
      address: '',
      startTime: '',
      endTime: '',
      entryFee: 0,
      maxTicketsPerUser: 1,
    },
    values,
  });

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
    navigate('/events');
  };

  if (isLoading) return <LoadingState />;
  if (isError || !event) {
    return <ErrorState message="Événement introuvable." onRetry={() => void refetch()} />;
  }

  const onSubmit = handleSubmit((form) => {
    updateMutation.mutate({
      id,
      payload: {
        title: form.title,
        description: form.description,
        address: form.address,
        startTime: fromDateTimeLocalValue(form.startTime),
        endTime: fromDateTimeLocalValue(form.endTime),
        entryFee: Number(form.entryFee),
        maxTicketsPerUser: Number(form.maxTicketsPerUser),
        tagIds: JSON.stringify(selectedTagIds),
        existingImages: JSON.stringify(imagesState.keptImages),
        coverFile: imagesState.coverFile ?? undefined,
        galleryFiles: imagesState.newFiles,
      },
    });
  });

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Supprimer « ${event.title} » ?`,
      description: 'Action irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate(id, { onSuccess: () => navigate('/events') });
  };

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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(event.startTime)}
          </p>
        </div>
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
                <Field label="Début" htmlFor="startTime">
                  <Input id="startTime" type="datetime-local" {...register('startTime')} />
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

              <Field label="Description" htmlFor="description">
                <Textarea id="description" rows={4} {...register('description')} />
              </Field>

              <Field label="Tags">
                <TagPicker
                  categories={categories}
                  value={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </Field>

              <Field label="Images">
                <ImagesEditor
                  resetKey={event.id}
                  coverUrl={event.coverUrl}
                  images={event.images}
                  onChange={setImagesState}
                />
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
              <CardTitle>Métadonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <MetaRow label="Organisateur">
                {event.User ? (
                  <div className="flex items-center gap-2">
                    <Avatar src={event.User.avatarUrl} name={event.User.username} className="h-6 w-6" />
                    <span>{event.User.displayName || event.User.username}</span>
                  </div>
                ) : (
                  '—'
                )}
              </MetaRow>
              <MetaRow label="Lieu">{event.Place?.name || '—'}</MetaRow>
              <MetaRow label="Ville">{event.City?.name || '—'}</MetaRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                Billets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {event.TicketType && event.TicketType.length > 0 ? (
                <div className="space-y-2">
                  {event.TicketType.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{ticket.name}</span>
                      <span className="text-muted-foreground">
                        {Number(ticket.price).toLocaleString('fr-FR')} F · {ticket.quantity} pl.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Entrée libre / aucun billet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revisions && revisions.length > 0 ? (
                <ul className="space-y-3">
                  {revisions.slice(0, 8).map((revision) => (
                    <li key={revision.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                      <div className="min-w-0">
                        <p className="font-medium">
                          {ACTION_LABEL[revision.action] || revision.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {revision.actor?.displayName ||
                            revision.actor?.username ||
                            'Système'}{' '}
                          · {formatRelative(revision.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun historique.</p>
              )}
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
