import type { EventWrite } from './types';
import { api } from '../../lib/api/client';
import { page } from '../../lib/api/json-codec';
import type { Params } from '../../lib/api/types';
import { decodeEvent } from './types';
export const getEvents = (params: Params, signal?: AbortSignal) =>
  api.request('/api/events', (v) => page(v, decodeEvent), { params, signal });
export const getEvent = (id: number, signal?: AbortSignal) =>
  api.request(`/api/events/${id}`, decodeEvent, { signal });
export const createEvent = (body: EventWrite) =>
  api.request('/api/events', decodeEvent, { method: 'POST', body, protected: true });
export const updateEvent = (id: number, body: EventWrite) =>
  api.request(`/api/events/${id}`, decodeEvent, {
    method: 'PUT',
    body: { ...body, id },
    protected: true,
  });
export const deleteEvent = (id: number) =>
  api.void(`/api/events/${id}`, { method: 'DELETE', protected: true });
