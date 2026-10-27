import { useMutation, useQueryClient } from '@tanstack/react-query';
import { keys } from '../../lib/query/keys';
import { vault } from '../../lib/auth/session-vault';
import { createCountry, updateCountry, deleteCountry } from './api';
import type { CountryWrite } from './types';
export function useCreateCountry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createCountry,
    onMutate: () => vault.generation(),
    onSuccess: (country, _v, g) => {
      if (g !== vault.generation()) return;
      client.setQueryData(keys.countries.detail(country.id), country);
      void client.invalidateQueries({ queryKey: keys.countries.all });
    },
  });
}
export function useUpdateCountry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CountryWrite }) => updateCountry(id, body),
    onMutate: () => vault.generation(),
    onSuccess: (_d, _v, g) => {
      if (g === vault.generation()) void client.invalidateQueries({ queryKey: keys.countries.all });
    },
  });
}
export function useDeleteCountry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteCountry,
    onMutate: () => vault.generation(),
    onSuccess: (_d, id, g) => {
      if (g !== vault.generation()) return;
      client.removeQueries({ queryKey: keys.countries.detail(id) });
      void client.invalidateQueries({ queryKey: keys.countries.all });
    },
  });
}
