import { useMemo, useState } from 'react';
import { ChevronRight, MapPin, Plus, Search, Trash2 } from 'lucide-react';
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
  Select,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/ui';
import { useCategories } from '@/features/categories/useCategories';
import { useConfirm } from '@/lib/confirm/useConfirm';
import { useDocumentTitle } from '@/lib/use-document-title';
import { resolveMediaUrl } from '@/lib/media';
import { usePagination } from '@/lib/use-pagination';
import { cn } from '@/lib/utils';
import type { AdminPlace } from './places.api';
import { useDeletePlace, usePlaces } from './usePlaces';

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const FILTER_LABEL: Record<StatusFilter, string> = {
  ALL: 'Tous',
  PENDING: 'En attente',
  APPROVED: 'Approuvés',
  REJECTED: 'Rejetés',
};

export function PlacesPage() {
  useDocumentTitle('Lieux');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const { data, isLoading, isError, refetch } = usePlaces();
  const { data: categories } = useCategories();
  const deleteMutation = useDeletePlace();
  const confirm = useConfirm();

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Un lieu n'a pas de "catégorie" simple : on la déduit des catégories de ses tags
  // (un lieu peut donc relever de plusieurs catégories). Fallback sur le champ libre.
  const getPlaceCategories = (place: AdminPlace): string[] => {
    const ids = new Set<number>();
    (place.PlaceTag ?? []).forEach((pt) => {
      if (pt.Tag?.categoryId != null) ids.add(pt.Tag.categoryId);
    });
    const names = [...ids]
      .map((id) => categoryNameById.get(id))
      .filter((name): name is string => Boolean(name));
    if (names.length === 0 && place.category) return [place.category];
    return names;
  };

  const places = useMemo(() => {
    let list = data ?? [];
    if (status !== 'ALL') {
      list = list.filter(
        (p) => (p.moderationStatus ?? 'PENDING').toUpperCase() === status,
      );
    }
    if (categoryFilter !== 'ALL') {
      list = list.filter((p) => getPlaceCategories(p).includes(categoryFilter));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.name, p.City?.name, p.category, p.address]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [data, status, categoryFilter, query, categoryNameById]);

  const { page, setPage, pageSize, setPageSize, total, totalPages, pageItems } =
    usePagination(places);

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Supprimer « ${name} » ?`,
      description: 'Action irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lieux"
        description="Consultez, modérez, corrigez ou supprimez les lieux de la plateforme."
        actions={
          <Button onClick={() => navigate('/places/new')}>
            <Plus className="h-4 w-4" />
            Nouveau lieu
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                status === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {FILTER_LABEL[value]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="ALL">Toutes les catégories</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </Select>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un lieu, une ville…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : places.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Aucun lieu"
            description={query || status !== 'ALL' ? 'Aucun résultat pour ces filtres.' : undefined}
          />
        ) : (
          <Table>
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Lieu</Th>
                <Th>Catégorie</Th>
                <Th>Propriétaire</Th>
                <Th>Note</Th>
                <Th>Statut</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {pageItems.map((place) => {
                const cover = resolveMediaUrl(place.coverUrl);
                return (
                  <Tr
                    key={place.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/places/${place.id}`)}
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {cover && (
                            <img src={cover} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{place.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {place.City?.name || place.address || '—'}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {(() => {
                        const cats = getPlaceCategories(place);
                        if (cats.length === 0) {
                          return <span className="text-xs text-muted-foreground">—</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            {cats.slice(0, 2).map((name) => (
                              <Badge key={name} tone="neutral">
                                {name}
                              </Badge>
                            ))}
                            {cats.length > 2 && (
                              <Badge tone="neutral">+{cats.length - 2}</Badge>
                            )}
                          </div>
                        );
                      })()}
                    </Td>
                    <Td className="text-sm text-muted-foreground">
                      {place.Owner?.displayName || place.Owner?.username || '—'}
                    </Td>
                    <Td className="text-sm">
                      {place.avgRating ? `★ ${place.avgRating.toFixed(1)}` : '—'}
                    </Td>
                    <Td>
                      <StatusBadge status={place.moderationStatus} />
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          loading={
                            deleteMutation.isPending &&
                            deleteMutation.variables === place.id
                          }
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(place.id, place.name)}
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
