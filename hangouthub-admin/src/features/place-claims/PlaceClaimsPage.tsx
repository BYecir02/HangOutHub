import { useMemo, useState } from 'react';
import { Check, FileText, X } from 'lucide-react';

import {
  Avatar,
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
import { resolveMediaUrl } from '@/lib/media';
import { usePagination } from '@/lib/use-pagination';
import { cn } from '@/lib/utils';
import { usePlaceClaims, useUpdatePlaceClaimStatus } from './usePlaceClaims';

type Filter = 'PENDING' | 'ALL';

export function PlaceClaimsPage() {
  useDocumentTitle('Revendications');
  const [filter, setFilter] = useState<Filter>('PENDING');
  const { data, isLoading, isError, refetch } = usePlaceClaims();
  const mutation = useUpdatePlaceClaimStatus();

  const claims = useMemo(() => {
    const list = data ?? [];
    if (filter === 'PENDING') {
      return list.filter(
        (c) => (c.status ?? 'PENDING').toUpperCase() === 'PENDING',
      );
    }
    return list;
  }, [data, filter]);

  const { page, setPage, pageSize, setPageSize, total, totalPages, pageItems } =
    usePagination(claims);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revendications de lieux"
        description="Vérifiez le justificatif avant d'attribuer la propriété d'un lieu."
      />

      <div className="flex items-center gap-2">
        {(['PENDING', 'ALL'] as const).map((value) => (
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
            {value === 'PENDING' ? 'En attente' : 'Toutes'}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : claims.length === 0 ? (
          <EmptyState
            title="Aucune revendication"
            description="Rien à vérifier pour le moment. 👌"
          />
        ) : (
          <Table>
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Lieu</Th>
                <Th>Demandeur</Th>
                <Th>Justificatif</Th>
                <Th>Date</Th>
                <Th>Statut</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {pageItems.map((claim) => {
                const status = (claim.status ?? 'PENDING').toUpperCase();
                const isPending = status === 'PENDING';
                const isRow =
                  mutation.isPending && mutation.variables?.claimId === claim.id;
                const docUrl = resolveMediaUrl(claim.documentUrl);

                return (
                  <Tr key={claim.id}>
                    <Td>
                      <p className="font-medium">{claim.Place?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {claim.Place?.City?.name || ''}
                      </p>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={claim.User?.avatarUrl}
                          name={claim.User?.username}
                          className="h-7 w-7"
                        />
                        <span className="text-sm">
                          {claim.User?.displayName || claim.User?.username || '—'}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      {docUrl ? (
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          Voir le document
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className="text-sm text-muted-foreground">
                      {formatDate(claim.createdAt)}
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
                              loading={isRow && mutation.variables?.status === 'APPROVED'}
                              disabled={mutation.isPending}
                              onClick={() =>
                                mutation.mutate({ claimId: claim.id, status: 'APPROVED' })
                              }
                            >
                              <Check className="h-4 w-4" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              loading={isRow && mutation.variables?.status === 'REJECTED'}
                              disabled={mutation.isPending}
                              onClick={() =>
                                mutation.mutate({ claimId: claim.id, status: 'REJECTED' })
                              }
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
