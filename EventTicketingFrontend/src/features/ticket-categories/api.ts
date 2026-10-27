import type { Params } from '../../lib/api/types';
import type { CategoryWrite } from './types';
import { api } from '../../lib/api/client';
import { array, page, wireMoney } from '../../lib/api/json-codec';
import { decodeAvailability, decodeCategory } from './types';
export const getAvailability = (id: number, signal?: AbortSignal) =>
  api.request(`/api/events/${id}/availability`, (v) => array(v, decodeAvailability), { signal });
export const getCategories = (params: Params, signal?: AbortSignal) =>
  api.request('/api/ticket-categories', (v) => page(v, decodeCategory), { params, signal });
export const createCategory = (body: CategoryWrite) =>
  api.request('/api/ticket-categories', decodeCategory, {
    method: 'POST',
    body: { ...body, price: wireMoney(body.price) },
    protected: true,
  });
export const updateCategory = (id: number, body: CategoryWrite) =>
  api.request(`/api/ticket-categories/${id}`, decodeCategory, {
    method: 'PUT',
    body: { ...body, price: wireMoney(body.price), id },
    protected: true,
  });
export const deleteCategory = (id: number) =>
  api.void(`/api/ticket-categories/${id}`, { method: 'DELETE', protected: true });
