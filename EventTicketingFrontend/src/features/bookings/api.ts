import { api } from '../../lib/api/client';
import { page } from '../../lib/api/json-codec';
import type { Params } from '../../lib/api/types';
import { decodeBooking } from './types';
import type { CreateBooking, CancelBooking } from './types';
export const createBooking = (body: CreateBooking) =>
  api.request('/api/bookings', decodeBooking, { method: 'POST', body, protected: true });
export const getMine = (params: Params, signal?: AbortSignal) =>
  api.request('/api/bookings/mine', (v) => page(v, decodeBooking), {
    params,
    signal,
    protected: true,
  });
export const getBooking = (id: number, signal?: AbortSignal) =>
  api.request(`/api/bookings/${id}`, decodeBooking, { signal, protected: true });
export const cancelBooking = (id: number, body: CancelBooking) =>
  api.request(`/api/bookings/${id}/cancel`, decodeBooking, {
    method: 'POST',
    body,
    protected: true,
  });
export const getEventBookings = (id: number, params: Params, signal?: AbortSignal) =>
  api.request(`/api/events/${id}/bookings`, (v) => page(v, decodeBooking), {
    params,
    signal,
    protected: true,
  });
