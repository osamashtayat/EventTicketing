import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keys } from '../../lib/query/keys';
import { vault } from '../../lib/auth/session-vault';
import { createVenue, deleteVenue } from './api';
export function useCreateVenue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createVenue,
    onMutate: () => vault.generation(),
    onSuccess: (venue, _v, g) => {
      if (g !== vault.generation()) return;
      client.setQueryData(keys.venues.detail(venue.id), venue);
      void client.invalidateQueries({ queryKey: keys.venues.all });
      void client.invalidateQueries({ queryKey: keys.countries.all });
    },
  });
}
export function useDeleteVenue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteVenue,
    onMutate: () => vault.generation(),
    onSuccess: (_v, id, g) => {
      if (g !== vault.generation()) return;
      client.removeQueries({ queryKey: keys.venues.detail(id) });
      void client.invalidateQueries({ queryKey: keys.venues.all });
      void client.invalidateQueries({ queryKey: keys.countries.all });
    },
  });
}
