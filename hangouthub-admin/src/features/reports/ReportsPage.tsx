import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';

import {
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
import { formatRelative } from '@/lib/format';
import { usePagination } from '@/lib/use-pagination';
import { cn } from '@/lib/utils';
import { useReports, useUpdateReportStatus } from './useReports';

type Filter = 'PENDING' | 'ALL';

export function ReportsPage() {
  useDocumentTitle('Signalements');
  const [filter, setFilter] = useState<Filter>('PENDING');
  const { data, isLoading, isError, refetch } = useReports();
  const mutation = useUpdateReportStatus();

  const reports = useMemo(() => {
    const list = data ?? [];
    if (filter === 'PENDING') {
      return list.filter(
        (r) => (r.status ?? 'PENDING').toUpperCase() === 'PENDING',
      );
    }
    return list;
  }, [data, filter]);

  const { page, setPage, pageSize, setPageSize, total, totalPages, pageItems } =
    usePagination(reports);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Signalements"
        description="Traitez les contenus et comptes signalés par la communauté."
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
            {value === 'PENDING' ? 'En attente' : 'Tous'}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : reports.length === 0 ? (
          <EmptyState
            title="Aucun signalement"
            description="Rien à modérer pour le moment. 👌"
          />
        ) : (
          <Table>
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Cible</Th>
                <Th>Motif</Th>
                <Th>Signalé par</Th>
                <Th>Quand</Th>
                <Th>Statut</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {pageItems.map((report) => {
                const status = (report.status ?? 'PENDING').toUpperCase();
                const isPending = status === 'PENDING';
                const isRow =
                  mutation.isPending && mutation.variables?.reportId === report.id;

                return (
                  <Tr key={report.id}>
                    <Td>
                      <Badge tone="neutral">{report.targetType}</Badge>
                      <p className="mt-1 max-w-[160px] truncate text-xs text-muted-foreground">
                        {report.targetId}
                      </p>
                    </Td>
                    <Td className="max-w-[280px]">
                      <p className="text-sm">{report.reason}</p>
                    </Td>
                    <Td className="text-sm text-muted-foreground">
                      {report.Reporter?.displayName ||
                        report.Reporter?.username ||
                        '—'}
                    </Td>
                    <Td className="text-sm text-muted-foreground">
                      {formatRelative(report.createdAt)}
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
                              loading={isRow && mutation.variables?.status === 'RESOLVED'}
                              disabled={mutation.isPending}
                              onClick={() =>
                                mutation.mutate({ reportId: report.id, status: 'RESOLVED' })
                              }
                            >
                              <Check className="h-4 w-4" />
                              Résoudre
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              loading={isRow && mutation.variables?.status === 'DISMISSED'}
                              disabled={mutation.isPending}
                              onClick={() =>
                                mutation.mutate({ reportId: report.id, status: 'DISMISSED' })
                              }
                            >
                              <X className="h-4 w-4" />
                              Classer
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
