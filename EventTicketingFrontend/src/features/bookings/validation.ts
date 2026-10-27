import type { AvailabilityDto } from '../ticket-categories/public';
import type { BookingDto, CancelBooking, CreateBooking } from './types';
export function quantity(value: string, max = 20): number {
  if (value === '') return 0;
  if (!/^\d+$/.test(value)) throw new Error('Quantities must be whole numbers.');
  const q = Number(value);
  if (!Number.isSafeInteger(q) || q < 0 || q > max)
    throw new Error(`Choose a quantity from 0 to ${max}.`);
  return q;
}
export function buildBooking(
  eventId: number,
  values: Record<string, string>,
  availability: AvailabilityDto[],
): CreateBooking {
  const items = Object.entries(values).flatMap(([id, value]) => {
    const q = quantity(value);
    if (q === 0) return [];
    const item = availability.find((a) => String(a.ticketCategoryId) === id);
    if (!item) throw new Error('A selected ticket category is no longer available.');
    if (q > item.availableQuantity)
      throw new Error(
        `Only ${item.availableQuantity} tickets are currently available for ${item.name}. Review your selection.`,
      );
    return [{ ticketCategoryId: item.ticketCategoryId, quantity: q }];
  });
  if (!items.length) throw new Error('Choose at least one ticket.');
  if (items.length > 20 || items.reduce((sum, i) => sum + i.quantity, 0) > 20)
    throw new Error('You can book at most 20 tickets in total.');
  return { eventId, items };
}
export function buildCancellation(
  booking: BookingDto,
  additional: Record<string, string>,
): CancelBooking {
  const items = Object.entries(additional).flatMap(([id, value]) => {
    const more = quantity(value);
    if (!more) return [];
    const item = booking.items.find((i) => String(i.id) === id);
    if (!item) throw new Error('A selected item does not belong to this booking.');
    if (more > item.remainingQuantity)
      throw new Error('Cancellation exceeds the remaining quantity. Refresh this booking.');
    return [{ bookingItemId: item.id, cancelledQuantity: item.cancelledQuantity + more }];
  });
  if (!items.length) throw new Error('Choose at least one additional ticket to cancel.');
  return { items };
}
