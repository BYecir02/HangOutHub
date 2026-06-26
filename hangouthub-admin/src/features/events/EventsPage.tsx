import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  Pagination,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/ui';
import { useConfirm } from '@/lib/confirm/useConfirm';
import { useDocumentTitle } from '@/lib/use-document-title';
import { formatDateTime } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media';
import { usePagination } from '@/lib/use-pagination';
import { cn } from '@/lib/utils';
import { useDeleteEvent, useEvents } from './useEvents';

const FILTERS = ['ALL', 'UPCOMING', 'PAST'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = {
  ALL: 'Tous',
  UPCOMING: 'À venir',
  PAST: 'Passés',
};

function formatEntryFee(fee: number | string | null | undefined) {
  const value = Number(fee ?? 0);
  return !value || Number.isNaN(value) ? 'Gratuit' : `${value.toLocaleString('fr-FR')} F`;
}

export function EventsPage() {
  useDocumentTitle('Événements');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const { data, isLoading, isError, refetch } = useEvents();
  const deleteMutation = useDeleteEvent();
  const confirm = useConfirm();

  const events = useMemo(() => {
    let list = data ?? [];
    const now = Date.now();
    if (filter === 'UPCOMING') {
      list = list.filter((e) => new Date(e.startTime).getTime() >= now);
    } else if (filter === 'PAST') {
      list = list.filter((e) => new Date(e.startTime).getTime() < now);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((e) =>
        [e.title, e.City?.name, e.Place?.name, e.address]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [data, filter, query]);

  const { page, setPage, pageSize, setPageSize, total, totalPages, pageItems } =
    usePagination(events);

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: `Supprimer « ${title} » ?`,
      description: 'Action irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Événements"
        description="Consultez, corrigez ou supprimez les événements de la plateforme."
        actions={
          <Button onClick={() => navigate('/events/new')}>
            <Plus className="h-4 w-4" />
            Nouvel événement
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                filter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {FILTER_LABEL[value]}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un événement…"
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Aucun événement"
            description={query || filter !== 'ALL' ? 'Aucun résultat pour ces filtres.' : undefined}
          />
        ) : (
          <Table>
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Événement</Th>
                <Th>Date</Th>
                <Th>Lieu</Th>
                <Th>Entrée</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {pageItems.map((event) => {
                const cover = resolveMediaUrl(event.coverUrl);
                const isPast = new Date(event.startTime).getTime() < Date.now();
                return (
                  <Tr
                    key={event.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {cover && (
                            <img src={cover} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{event.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {event.City?.name || event.address || '—'}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(event.startTime)}
                        </span>
                        {isPast && <Badge tone="neutral">Passé</Badge>}
                      </div>
                    </Td>
                    <Td className="text-sm text-muted-foreground">
                      {event.Place?.name || '—'}
                    </Td>
                    <Td className="text-sm">{formatEntryFee(event.entryFee)}</Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          loading={
                            deleteMutation.isPending &&
                            deleteMutation.variables === event.id
                          }
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(event.id, event.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
