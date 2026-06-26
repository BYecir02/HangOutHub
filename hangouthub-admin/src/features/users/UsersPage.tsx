import { useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
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
import { useConfirm } from '@/lib/confirm/useConfirm';
import { useDocumentTitle } from '@/lib/use-document-title';
import { formatDate } from '@/lib/format';
import { usePagination } from '@/lib/use-pagination';
import { useDeleteUser, useUsers } from './useUsers';

export function UsersPage() {
  useDocumentTitle('Utilisateurs');
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, refetch } = useUsers();
  const deleteMutation = useDeleteUser();
  const confirm = useConfirm();

  const users = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) =>
      [u.username, u.displayName, u.email, u.organizerCompanyName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q)),
    );
  }, [data, query]);

  const { page, setPage, pageSize, setPageSize, total, totalPages, pageItems } =
    usePagination(users);

  const handleDelete = async (userId: string, label: string) => {
    const ok = await confirm({
      title: `Supprimer « ${label} » ?`,
      description: 'Action irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate(userId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Rechercher, consulter et gérer les comptes."
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un nom, email, structure…"
          className="pl-9"
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : users.length === 0 ? (
          <EmptyState
            title="Aucun utilisateur"
            description={query ? 'Aucun résultat pour cette recherche.' : undefined}
          />
        ) : (
          <Table>
            <THead>
              <Tr className="hover:bg-transparent">
                <Th>Utilisateur</Th>
                <Th>Rôle</Th>
                <Th>État</Th>
                <Th>Inscrit le</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {pageItems.map((user) => {
                const label = user.displayName || user.username || user.email || user.id;
                return (
                  <Tr key={user.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.username || user.displayName} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{label}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email || `@${user.username}`}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={user.role === 'ADMIN' ? 'primary' : 'neutral'}>
                        {user.role || 'USER'}
                      </Badge>
                    </Td>
                    <Td>
                      <StatusBadge status={user.isSuspended ? 'SUSPENDED' : 'ACTIVE'} />
                    </Td>
                    <Td className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          loading={
                            deleteMutation.isPending &&
                            deleteMutation.variables === user.id
                          }
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(user.id, label)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
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
