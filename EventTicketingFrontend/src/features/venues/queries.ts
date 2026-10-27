import { queryOptions, useQuery } from '@tanstack/react-query';
import { keys } from '../../lib/query/keys';
import type { Params } from '../../lib/api/types';
import { getVenue, getVenues } from './api';
export const venueOptions = (id: number) =>
  queryOptions({
    queryKey: keys.venues.detail(id),
    queryFn: ({ signal }) => getVenue(id, signal),
    staleTime: 300000,
    enabled: id > 0,
  });
export const venuesOptions = (q: Params) =>
  queryOptions({
    queryKey: keys.venues.list(q),
    queryFn: ({ signal }) => getVenues(q, signal),
    staleTime: 300000,
  });
export const useVenue = (id: number) => useQuery(venueOptions(id));
export const useVenues = (q: Params) => useQuery(venuesOptions(q));
