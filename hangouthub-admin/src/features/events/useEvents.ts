import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '@/lib/api/errors';
import { useToast } from '@/lib/toast/useToast';
import {
  createEvent,
  deleteEvent,
  fetchEvent,
  fetchEventRevisions,
  fetchEvents,
  updateEvent,
  type CreateEventPayload,
  type UpdateEventPayload,
} from './events.api';

export const eventsKey = ['admin-events'] as const;
export const eventKey = (id: string) => ['admin-events', id] as const;
export const eventRevisionsKey = (id: string) =>
  ['admin-events', id, 'revisions'] as const;

export function useEvents() {
  return useQuery({ queryKey: eventsKey, queryFn: fetchEvents });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKey(id),
    queryFn: () => fetchEvent(id),
    enabled: Boolean(id),
  });
}

export function useEventRevisions(id: string) {
  return useQuery({
    queryKey: eventRevisionsKey(id),
    queryFn: () => fetchEventRevisions(id),
    enabled: Boolean(id),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: { id: string; payload: UpdateEventPayload }) =>
      updateEvent(vars.id, vars.payload),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: eventsKey });
      void queryClient.invalidateQueries({ queryKey: eventKey(vars.id) });
      void queryClient.invalidateQueries({ queryKey: eventRevisionsKey(vars.id) });
      toast({ title: 'Événement mis à jour', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventsKey });
      toast({ title: 'Événement supprimé', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventsKey });
      toast({ title: 'Événement créé', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}
