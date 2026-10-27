import {
  record,
  integer,
  string,
  decodeMoney as money,
  array,
  nullableString,
} from '../../lib/api/json-codec';
import { ApiError } from '../../lib/api/errors';
import { offsetTimestamp } from '../../utils/date-time';
import type { MoneyAmount } from '../../lib/api/types';
export interface BookingItem {
  id: number;
  ticketCategoryId: number;
  categoryName: string;
  quantity: number;
  cancelledQuantity: number;
  remainingQuantity: number;
  unitPrice: MoneyAmount;
  originalAmount: MoneyAmount;
  cancelledAmount: MoneyAmount;
  remainingAmount: MoneyAmount;
}
export interface BookingDto {
  id: number;
  eventId: number;
  status: 0 | 1 | 2;
  currency: 'USD';
  totalAmount: MoneyAmount;
  createdAtUtc: string;
  cancelledAtUtc: string | null;
  items: BookingItem[];
  cancelledAmount: MoneyAmount;
  remainingAmount: MoneyAmount;
}
export interface CreateBooking {
  eventId: number;
  items: { ticketCategoryId: number; quantity: number }[];
}
export interface CancelBooking {
  items?: { bookingItemId: number; cancelledQuantity: number }[];
}
export function decodeBooking(value: unknown): BookingDto {
  const o = record(value);
  const status = integer(o.status, 0, 2);
  if (status !== 0 && status !== 1 && status !== 2)
    throw new ApiError('contract', 'Unknown booking status.');
  if (o.currency !== 'USD') throw new ApiError('contract', 'Unsupported booking currency.');
  const cancelledAt = nullableString(o.cancelledAtUtc);
  return {
    id: integer(o.id, 1),
    eventId: integer(o.eventId, 1),
    status,
    currency: 'USD',
    totalAmount: money(o.totalAmount),
    createdAtUtc: offsetTimestamp(string(o.createdAtUtc)),
    cancelledAtUtc: cancelledAt === null ? null : offsetTimestamp(cancelledAt),
    cancelledAmount: money(o.cancelledAmount),
    remainingAmount: money(o.remainingAmount),
    items: array(o.items, (value) => {
      const i = record(value);
      return {
        id: integer(i.id, 1),
        ticketCategoryId: integer(i.ticketCategoryId, 1),
        categoryName: string(i.categoryName),
        quantity: integer(i.quantity, 1, 20),
        cancelledQuantity: integer(i.cancelledQuantity, 0, 20),
        remainingQuantity: integer(i.remainingQuantity, 0, 20),
        unitPrice: money(i.unitPrice),
        originalAmount: money(i.originalAmount),
        cancelledAmount: money(i.cancelledAmount),
        remainingAmount: money(i.remainingAmount),
      };
    }),
  };
}
export const statusLabels = { 0: 'Confirmed', 1: 'Partially cancelled', 2: 'Cancelled' };
