import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { keys } from '../../lib/query/keys';
import { vault } from '../../lib/auth/session-vault';
import { createCategory, updateCategory, deleteCategory } from './api';
import type { CategoryWrite } from './types';
function invalidate(client: QueryClient, eventIds: number[]) {
  void client.invalidateQueries({ queryKey: keys.categories.all });
  for (const id of new Set(eventIds)) {
    void client.invalidateQueries({ queryKey: keys.categories.availability(id) });
    void client.invalidateQueries({ queryKey: keys.events.detail(id) });
  }
}
export function useCreateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onMutate: () => vault.generation(),
    onSuccess: (category, _v, g) => {
      if (g !== vault.generation()) return;
      client.setQueryData(keys.categories.detail(category.id), category);
      invalidate(client, [category.eventId]);
    },
  });
}
export function useUpdateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CategoryWrite; oldEventId: number }) =>
      updateCategory(id, body),
    onMutate: () => vault.generation(),
    onSuccess: (category, v, g) => {
      if (g !== vault.generation()) return;
      client.setQueryData(keys.categories.detail(category.id), category);
      invalidate(client, [v.oldEventId, category.eventId]);
    },
  });
}
export function useDeleteCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; eventId: number }) => deleteCategory(id),
    onMutate: () => vault.generation(),
    onSuccess: (_d, v, g) => {
      if (g !== vault.generation()) return;
      client.removeQueries({ queryKey: keys.categories.detail(v.id) });
      invalidate(client, [v.eventId]);
    },
  });
}
