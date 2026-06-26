import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '@/lib/api/errors';
import { useToast } from '@/lib/toast/useToast';
import { categoriesKey } from '@/features/categories/useCategories';
import {
  createCategory,
  createTag,
  fetchTaxonomy,
  updateCategory,
  updateTag,
} from './taxonomy.api';

export const taxonomyKey = ['taxonomy'] as const;

export function useTaxonomy() {
  return useQuery({ queryKey: taxonomyKey, queryFn: fetchTaxonomy });
}

function useInvalidateTaxonomy() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: taxonomyKey });
    // Les sélecteurs de tags (fiches lieu/event) lisent /categories -> à rafraîchir aussi.
    void queryClient.invalidateQueries({ queryKey: categoriesKey });
  };
}

export function useCreateCategory() {
  const invalidate = useInvalidateTaxonomy();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: { name: string; color?: string; icon?: string }) =>
      createCategory(payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Catégorie créée', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateTaxonomy();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: {
      id: number;
      payload: { name?: string; color?: string; icon?: string };
    }) => updateCategory(vars.id, vars.payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Catégorie mise à jour', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}

export function useCreateTag() {
  const invalidate = useInvalidateTaxonomy();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: { categoryId: number; name: string }) =>
      createTag(vars.categoryId, vars.name),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Tag ajouté', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}

export function useUpdateTag() {
  const invalidate = useInvalidateTaxonomy();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: {
      tagId: number;
      payload: { name?: string; status?: string; categoryId?: number };
    }) => updateTag(vars.tagId, vars.payload),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Tag mis à jour', variant: 'success' });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}
