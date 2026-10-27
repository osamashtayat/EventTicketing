import type { Params } from '../api/types';
export const keys = {
  countries: {
    all: ['countries'] as const,
    list: (q: Params) => ['countries', 'list', q] as const,
    detail: (id: number) => ['countries', 'detail', id] as const,
    byName: (name: string) => ['countries', 'by-name', name] as const,
  },
  venues: {
    all: ['venues'] as const,
    list: (q: Params) => ['venues', 'list', q] as const,
    detail: (id: number) => ['venues', 'detail', id] as const,
  },
  events: {
    all: ['events'] as const,
    lists: ['events', 'list'] as const,
    list: (q: Params) => ['events', 'list', q] as const,
    detail: (id: number) => ['events', 'detail', id] as const,
  },
  categories: {
    all: ['ticket-categories'] as const,
    list: (q: Params) => ['ticket-categories', 'list', q] as const,
    detail: (id: number) => ['ticket-categories', 'detail', id] as const,
    availability: (id: number) => ['ticket-categories', 'availability', id] as const,
  },
  private: ['private'] as const,
  me: (g: number) => ['private', g, 'auth', 'me'] as const,
  mine: (g: number, q?: Params) =>
    q
      ? (['private', g, 'bookings', 'mine', q] as const)
      : (['private', g, 'bookings', 'mine'] as const),
  booking: (g: number, id: number) => ['private', g, 'bookings', 'detail', id] as const,
  history: (g: number, id: number, q?: Params) =>
    q
      ? (['private', g, 'bookings', 'event', id, q] as const)
      : (['private', g, 'bookings', 'event', id] as const),
};
export function isEventHistory(key: readonly unknown[], id: number) {
  return key[0] === 'private' && key[2] === 'bookings' && key[3] === 'event' && key[4] === id;
}
