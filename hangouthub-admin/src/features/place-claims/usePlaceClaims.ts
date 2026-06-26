import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '@/lib/api/errors';
import { useToast } from '@/lib/toast/useToast';
import { fetchPlaceClaims, updatePlaceClaimStatus } from './placeClaims.api';

export const placeClaimsKey = ['place-claims'] as const;

export function usePlaceClaims() {
  return useQuery({
    queryKey: placeClaimsKey,
    queryFn: fetchPlaceClaims,
  });
}

export function useUpdatePlaceClaimStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: { claimId: string; status: 'APPROVED' | 'REJECTED' }) =>
      updatePlaceClaimStatus(vars.claimId, vars.status),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: placeClaimsKey });
      toast({
        title:
          vars.status === 'APPROVED'
            ? 'Revendication approuvée'
            : 'Revendication rejetée',
        variant: 'success',
      });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}
