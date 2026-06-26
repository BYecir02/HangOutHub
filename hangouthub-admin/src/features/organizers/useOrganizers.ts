import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '@/lib/api/errors';
import { useToast } from '@/lib/toast/useToast';
import {
  fetchOrganizers,
  updateOrganizerStatus,
  type OrganizerStatus,
} from './organizers.api';

export const organizersKey = ['organizers'] as const;

export function useOrganizers() {
  return useQuery({
    queryKey: organizersKey,
    queryFn: fetchOrganizers,
  });
}

export function useUpdateOrganizerStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: { userId: string; status: OrganizerStatus }) =>
      updateOrganizerStatus(vars.userId, vars.status),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: organizersKey });
      toast({
        title:
          vars.status === 'APPROVED'
            ? 'Organisateur approuvé'
            : vars.status === 'REJECTED'
              ? 'Organisateur rejeté'
              : 'Statut mis à jour',
        variant: 'success',
      });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}
