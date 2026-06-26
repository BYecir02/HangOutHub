import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '@/lib/api/errors';
import { useToast } from '@/lib/toast/useToast';
import {
  createPlace,
  deletePlace,
  fetchPlace,
  fetchPlaces,
  updatePlace,
  type CreatePlacePayload,
  type UpdatePlacePayload,
} from './places.api';

export const placesKey = ['admin-places'] as const;
export const placeKey = (id: string) => ['admin-places', id] as const;

export function usePlaces() {
  return useQuery({ queryKey: placesKey, queryFn: fetchPlaces });
}

export function usePlace(id: string) {
  return useQuery({
    queryKey: placeKey(id),
    queryFn: () => fetchPlace(id),
    enabled: Boolean(id),
  });
}

export function useUpdatePlace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: { id: string; payload: UpdatePlacePayload }) =>
      updatePlace(vars.id, vars.payload),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: placesKey });
      void queryClient.invalidateQueries({ queryKey: placeKey(vars.id) });
      toast({ title: 'Lieu mis à jour', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}

export function useDeletePlace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => deletePlace(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: placesKey });
      toast({ title: 'Lieu supprimé', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}

export function useCreatePlace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: CreatePlacePayload) => createPlace(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: placesKey });
      toast({ title: 'Lieu créé', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}
