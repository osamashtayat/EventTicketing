import { queryOptions, useQuery } from '@tanstack/react-query';
import { keys } from '../../lib/query/keys';
import type { Params } from '../../lib/api/types';
import { getEvent, getEvents } from './api';
export const eventOptions = (id: number) =>
  queryOptions({
    queryKey: keys.events.detail(id),
    queryFn: ({ signal }) => getEvent(id, signal),
    enabled: id > 0,
  });
export const eventsOptions = (q: Params) =>
  queryOptions({
    queryKey: keys.events.list(q),
    queryFn: ({ signal }) => getEvents(q, signal),
    placeholderData: (previous, previousQuery) => {
      const before = previousQuery?.queryKey[2];
      if (typeof before !== 'object' || !before) return undefined;
      const { pageNumber: oldPage, ...oldFilters } = before;
      const { pageNumber: newPage, ...newFilters } = q;
      return oldPage !== newPage && JSON.stringify(oldFilters) === JSON.stringify(newFilters)
        ? previous
        : undefined;
    },
  });
export const useEvent = (id: number) => useQuery(eventOptions(id));
export const useEvents = (q: Params) => useQuery(eventsOptions(q));
