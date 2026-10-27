import { it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { configureApi } from '../src/lib/api/client';
import { categoryBody } from '../src/features/ticket-categories/validation';
import { eventBody } from '../src/features/events/validation';
import { useUpdateCategory } from '../src/features/ticket-categories/mutations';
import { makeQueryClient } from '../src/lib/query/client';
import { keys } from '../src/lib/query/keys';
it('serializes maximum category money numerically and invalidates both sides of a move', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response(
        '{"id":5,"name":"VIP","description":null,"price":9999999999999999.99,"capacity":50,"eventId":13}',
      ),
    );
  configureApi('https://api.test', {
    generation: () => 0,
    token: () => 'fixture',
    prepare: async () => {},
    refresh: async () => {},
  });
  const client = makeQueryClient();
  client.setQueryData(keys.categories.availability(12), []);
  client.setQueryData(keys.categories.availability(13), []);
  const { result } = renderHook(() => useUpdateCategory(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  const body = categoryBody({
    name: 'VIP',
    description: '',
    price: '9999999999999999.99',
    capacity: '50',
    eventId: '13',
  });
  await act(async () => {
    await result.current.mutateAsync({ id: 5, body, oldEventId: 12 });
  });
  expect(fetcher.mock.calls[0]?.[1]?.body).toContain('"price":9999999999999999.99');
  expect(fetcher.mock.calls[0]?.[1]?.body).not.toContain('"price":"');
  expect(client.getQueryState(keys.categories.availability(12))?.isInvalidated).toBe(true);
  expect(client.getQueryState(keys.categories.availability(13))?.isInvalidated).toBe(true);
});
it('uses complete event bodies, rejects blank numbers and invalid ranges', () => {
  const values = {
    name: 'Event',
    description: '',
    startDate: '2030-11-10T19:00',
    endDate: '2030-11-10T22:00',
    capacity: '100',
    venueId: '3',
  };
  expect(eventBody(values)).toEqual({
    name: 'Event',
    description: null,
    startDate: '2030-11-10T19:00:00.000Z',
    endDate: '2030-11-10T22:00:00.000Z',
    capacity: 100,
    venueId: 3,
  });
  expect(() => eventBody({ ...values, capacity: '' })).toThrow();
  expect(() => eventBody({ ...values, endDate: '2030-11-10T18:00' })).toThrow();
  expect(() =>
    categoryBody({ name: 'Tier', description: '', price: '0.001', capacity: '1', eventId: '12' }),
  ).toThrow();
});
