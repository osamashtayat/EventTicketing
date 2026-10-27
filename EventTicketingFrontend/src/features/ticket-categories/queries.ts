import type { Params } from '../../lib/api/types';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { keys } from '../../lib/query/keys';
import { getAvailability, getCategories } from './api';
export const availabilityOptions = (id: number) =>
  queryOptions({
    queryKey: keys.categories.availability(id),
    queryFn: ({ signal }) => getAvailability(id, signal),
    staleTime: 0,
    enabled: id > 0,
  });
export const useEventAvailability = (id: number) => useQuery(availabilityOptions(id));

export const useCategories = (params: Params) =>
  useQuery({
    queryKey: keys.categories.list(params),
    queryFn: ({ signal }) => getCategories(params, signal),
  });
