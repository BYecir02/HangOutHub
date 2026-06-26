import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination,
  StatusBadge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/ui';
import { useDocumentTitle } from '@/lib/use-document-title';
import { formatDate } from '@/lib/format';
import { usePagination } from '@/lib/use-pagination';
import { cn } from '@/lib/utils';
import { useOrganizers, useUpdateOrganizerStatus } from './useOrganizers';
import type { OrganizerStatus } from './organizers.api';

type Filter = 'PENDING' | 'ALL';

export function OrganizersPage() {
  useDocumentTitle('Organisateurs');
  const [filter, setFilter] = useState<Filter>('PENDING');
  const { data, isLoading, isError, refetch } = useOrganizers();
  const mutation = useUpdateOrganizerStatus();

  const organizers = useMemo(() => {
    const list = data ?? [];
    if (filter === 'PENDING') {
      return list.filter(
        (o) => (o.organizer?.status ?? 'PENDING').toUpperCase() === 'PENDING',
      );
    }
    return list;
  }, [data, filter]);

  const { page, setPage, pageSize, setPageSize, total, totalPages, pageItems } =
    usePagination(organizers);

  const pendingCount = useMemo(
    () =>
      (data ?? []).filter(
        (o) => (o.organizer?.status ?? 'PENDING').toUpperCase() === 'PENDING',
      ).length,
    [data],
  );

  const decide = (userId: string, status: OrganizerStatus) => {
    mutation.mutate({ userId, status });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisateurs"
        description="Validez les demandes des lieux et promoteurs avant qu'ils ne puissent opérer."
      />

      <div className="flex items-center gap-2">
        {(['PENDING', 'ALL'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {value === 'PENDING' ? 'En attente' : 'Tous'}
            {value === 'PENDING' && pendingCount > 0 && (
              <Badge tone={filter === value ? 'neutral' : 'warning'}>
                {pendingCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : organizers.length === 0 ? (
          <EmptyState
            title="Aucun organisateur"
            description={
              filter === 'PENDING'
                ? 'Aucune demande en attente. 👌'
                : 'Aucun organisateur enregistré pour le moment.'
            }
          />
        ) : (
          <Table>
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Structure</Th>
                <Th>Type</Th>
                <Th>Contact</Th>
                <Th>Demande</Th>
                <Th>Statut</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {pageItems.map((o) => {
                const status = (o.organizer?.status ?? 'PENDING').toUpperCase();
                const isPending = status === 'PENDING';
                const isMutatingRow =
                  mutation.isPending && mutation.variables?.userId === o.id;

                return (
                  <Tr key={o.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={o.organizer?.companyName || o.username} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {o.organizer?.companyName || '—'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {o.organizer?.jobTitle || ''}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={o.organizer?.accountType === 'PLACE' ? 'info' : 'primary'}>
                        {o.organizer?.accountType === 'PLACE' ? 'Lieu' : 'Promoteur'}
                      </Badge>
                    </Td>
                    <Td>
                      <p className="text-sm">{o.displayName || o.username || '—'}</p>
                      <p className="text-xs text-muted-foreground">{o.email || ''}</p>
                    </Td>
                    <Td className="text-sm text-muted-foreground">
                      {formatDate(o.organizer?.createdAt)}
                    </Td>
                    <Td>
                      <StatusBadge status={status} />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        {isPending ? (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              loading={isMutatingRow && mutation.variables?.status === 'APPROVED'}
                              disabled={mutation.isPending}
                              onClick={() => decide(o.id, 'APPROVED')}
                            >
                              <Check className="h-4 w-4" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              loading={isMutatingRow && mutation.variables?.status === 'REJECTED'}
                              disabled={mutation.isPending}
                              onClick={() => decide(o.id, 'REJECTED')}
                            >
                              <X className="h-4 w-4" />
                              Rejeter
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
