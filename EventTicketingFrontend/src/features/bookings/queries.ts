import { useQuery } from '@tanstack/react-query';
import { vault } from '../../lib/auth/session-vault';
import { keys } from '../../lib/query/keys';
import type { Params } from '../../lib/api/types';
import { getMine, getBooking, getEventBookings } from './api';
export const useMyBookings = (generation: number, q: Params) =>
  useQuery({
    queryKey: keys.mine(generation, q),
    queryFn: ({ signal }) => getMine(q, signal),
    staleTime: 0,
    enabled: !!vault.token(),
  });
export const useBooking = (generation: number, id: number) =>
  useQuery({
    queryKey: keys.booking(generation, id),
    queryFn: ({ signal }) => getBooking(id, signal),
    staleTime: 0,
    enabled: !!vault.token() && id > 0,
  });
export const useEventBookings = (generation: number, id: number, q: Params) =>
  useQuery({
    queryKey: keys.history(generation, id, q),
    queryFn: ({ signal }) => getEventBookings(id, q, signal),
    staleTime: 0,
    enabled: !!vault.token() && id > 0,
  });
