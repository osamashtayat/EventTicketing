import type { CountryWrite, CountryDetail } from './types';
import { api } from '../../lib/api/client';
import { page, record, array, integer, string, nullableString } from '../../lib/api/json-codec';
import type { Params } from '../../lib/api/types';
import { decodeCountrySummary } from './types';
export const getCountries = (params: Params, signal?: AbortSignal) =>
  api.request('/api/countries', (v) => page(v, decodeCountrySummary), { params, signal });
export const getCountry = (id: number, signal?: AbortSignal) =>
  api.request(`/api/countries/${id}`, decodeCountry, { signal });

function decodeCountry(value: unknown): CountryDetail {
  const o = record(value);
  return {
    ...decodeCountrySummary(o),
    venues: array(o.venues, (v) => {
      const venue = record(v);
      return {
        id: integer(venue.id, 1),
        name: string(venue.name),
        city: string(venue.city),
        countryId: integer(venue.countryId, 1),
        address: nullableString(venue.address),
      };
    }),
  };
}
export const createCountry = (body: CountryWrite) =>
  api.request('/api/countries', decodeCountry, { method: 'POST', body, protected: true });
export const updateCountry = (id: number, body: CountryWrite) =>
  api.void(`/api/countries/${id}`, { method: 'PUT', body: { ...body, id }, protected: true });
export const deleteCountry = (id: number) =>
  api.void(`/api/countries/${id}`, { method: 'DELETE', protected: true });
