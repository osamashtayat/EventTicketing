import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keys, isEventHistory } from '../../lib/query/keys';
import { vault } from '../../lib/auth/session-vault';
import { createEvent, updateEvent, deleteEvent } from './api';
import type { EventWrite } from './types';
export function useCreateEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onMutate: () => vault.generation(),
    onSuccess: (event, _v, g) => {
      if (g !== vault.generation()) return;
      client.setQueryData(keys.events.detail(event.id), event);
      void client.invalidateQueries({ queryKey: keys.events.lists });
    },
  });
}
export function useUpdateEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: EventWrite }) => updateEvent(id, body),
    onMutate: () => vault.generation(),
    onSuccess: (event, _v, g) => {
      if (g !== vault.generation()) return;
      client.setQueryData(keys.events.detail(event.id), event);
      void client.invalidateQueries({ queryKey: keys.events.lists });
      void client.invalidateQueries({ queryKey: keys.categories.availability(event.id) });
      void client.invalidateQueries({ predicate: (q) => isEventHistory(q.queryKey, event.id) });
    },
  });
}
export function useDeleteEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onMutate: () => vault.generation(),
    onSuccess: (_d, id, g) => {
      if (g !== vault.generation()) return;
      client.removeQueries({ queryKey: keys.events.detail(id) });
      void client.invalidateQueries({ queryKey: keys.events.lists });
      void client.invalidateQueries({ queryKey: keys.categories.availability(id) });
    },
  });
}
