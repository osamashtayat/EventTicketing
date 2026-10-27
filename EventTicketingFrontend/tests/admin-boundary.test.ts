import { it, expect, vi, afterEach } from 'vitest';
import { configureApi } from '../src/lib/api/client';
import { updateCountry } from '../src/features/countries/api';
import { createVenue } from '../src/features/venues/api';
import { venueFixture } from './fixtures';
const auth = {
  generation: () => 1,
  token: () => 'fixture',
  prepare: async () => {},
  refresh: async () => {},
};
afterEach(() => vi.restoreAllMocks());
it('country PUT sends a complete matching body and accepts 204', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 204 }));
  configureApi('https://api.test', auth);
  await expect(updateCountry(1, { name: 'Jordan', shortName: 'JO' })).resolves.toBeUndefined();
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/api/countries/1');
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    method: 'PUT',
    body: '{"name":"Jordan","shortName":"JO","id":1}',
  });
});
it('venue creation sends capacity without fabricating it in read DTOs', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(venueFixture, { status: 201 }));
  configureApi('https://api.test', auth);
  const result = await createVenue({
    name: 'Hall',
    city: 'Amman',
    countryId: 1,
    capacity: 100,
    address: '',
  });
  expect(result).not.toHaveProperty('capacity');
});
