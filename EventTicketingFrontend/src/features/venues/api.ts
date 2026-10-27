import type { VenueWrite } from './types';
import { api } from '../../lib/api/client';
import { page } from '../../lib/api/json-codec';
import type { Params } from '../../lib/api/types';
import { decodeVenue } from './types';
export const getVenues = (params: Params, signal?: AbortSignal) =>
  api.request('/api/venues', (v) => page(v, decodeVenue), { params, signal });
export const getVenue = (id: number, signal?: AbortSignal) =>
  api.request(`/api/venues/${id}`, decodeVenue, { signal });
export const createVenue = (body: VenueWrite) =>
  api.request('/api/venues', decodeVenue, { method: 'POST', body, protected: true });
export const deleteVenue = (id: number) =>
  api.void(`/api/venues/${id}`, { method: 'DELETE', protected: true });
