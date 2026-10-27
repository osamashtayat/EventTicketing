import {
  record,
  integer,
  string,
  decodeMoney as money,
  nullableString,
} from '../../lib/api/json-codec';
import { ApiError } from '../../lib/api/errors';
import type { MoneyAmount } from '../../lib/api/types';
export interface AvailabilityDto {
  ticketCategoryId: number;
  name: string;
  price: MoneyAmount;
  currency: 'USD';
  capacity: number;
  bookedQuantity: number;
  availableQuantity: number;
}
export interface CategoryDto {
  id: number;
  name: string;
  description: string | null;
  price: MoneyAmount;
  capacity: number;
  eventId: number;
}
export interface CategoryWrite {
  name: string;
  description: string | null;
  price: MoneyAmount;
  capacity: number;
  eventId: number;
}
export function decodeAvailability(value: unknown): AvailabilityDto {
  const o = record(value);
  if (o.currency !== 'USD') throw new ApiError('contract', 'Unsupported currency.');
  return {
    ticketCategoryId: integer(o.ticketCategoryId, 1),
    name: string(o.name),
    price: money(o.price),
    currency: 'USD',
    capacity: integer(o.capacity, 1),
    bookedQuantity: integer(o.bookedQuantity),
    availableQuantity: integer(o.availableQuantity),
  };
}
export function decodeCategory(value: unknown): CategoryDto {
  const o = record(value);
  return {
    id: integer(o.id, 1),
    name: string(o.name),
    description: nullableString(o.description),
    price: money(o.price),
    capacity: integer(o.capacity, 1),
    eventId: integer(o.eventId, 1),
  };
}
