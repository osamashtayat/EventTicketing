import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { vault } from '../../lib/auth/session-vault';
import { keys, isEventHistory } from '../../lib/query/keys';
import { createBooking, cancelBooking } from './api';
import type { BookingDto, CreateBooking, CancelBooking } from './types';
function cacheBooking(client: QueryClient, booking: BookingDto, generation: number) {
  void client.invalidateQueries({ queryKey: keys.categories.availability(booking.eventId) });
  if (generation !== vault.generation()) return;
  client.setQueryData(keys.booking(generation, booking.id), booking);
  void client.invalidateQueries({ queryKey: keys.mine(generation) });
  void client.invalidateQueries({ predicate: (q) => isEventHistory(q.queryKey, booking.eventId) });
}
export function useCreateBooking() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    networkMode: 'always',
    onMutate: () => vault.generation(),
    mutationFn: async (body: CreateBooking) => {
      const generation = vault.generation();
      const booking = await createBooking(body);
      return { booking, generation };
    },
    onSuccess: ({ booking, generation }) => cacheBooking(client, booking, generation),
    onError: (_error, body) => {
      void client.invalidateQueries({ queryKey: keys.categories.availability(body.eventId) });
    },
  });
}
export function useCancelBooking() {
  const client = useQueryClient();
  return useMutation({
    retry: false,
    networkMode: 'always',
    onMutate: () => vault.generation(),
    mutationFn: async ({ id, body }: { id: number; body: CancelBooking }) => {
      const generation = vault.generation();
      const booking = await cancelBooking(id, body);
      return { booking, generation };
    },
    onSuccess: ({ booking, generation }) => cacheBooking(client, booking, generation),
    onError: (_error, { id }, generation) => {
      if (generation !== vault.generation()) return;
      void client.invalidateQueries({ queryKey: keys.booking(generation, id) });
    },
  });
}
