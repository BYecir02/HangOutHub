import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '@/lib/api/errors';
import { useToast } from '@/lib/toast/useToast';
import { deleteUser, fetchUsers } from './users.api';

export const usersKey = ['users'] as const;

export function useUsers() {
  return useQuery({
    queryKey: usersKey,
    queryFn: fetchUsers,
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersKey });
      toast({ title: 'Utilisateur supprimé', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}
