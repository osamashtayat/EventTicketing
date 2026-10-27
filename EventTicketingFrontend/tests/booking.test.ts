import { it, expect } from 'vitest';
import { buildBooking, buildCancellation } from '../src/features/bookings/validation';
import { decodeAvailability } from '../src/features/ticket-categories/types';
import { decodeBooking } from '../src/features/bookings/types';
import { parseJson } from '../src/lib/api/json-codec';
import { availabilityFixture, bookingFixture } from './fixtures';
const availability = availabilityFixture.map((v) =>
  decodeAvailability(parseJson(JSON.stringify(v))),
);
it('allows 20 tickets and rejects 21, noninteger, stock overrun and unknown tiers', () => {
  expect(buildBooking(12, { '5': '20' }, availability)).toEqual({
    eventId: 12,
    items: [{ ticketCategoryId: 5, quantity: 20 }],
  });
  for (const values of [{ '5': '21' }, { '5': '1.5' }, { '9': '1' }, { '5': '' }])
    expect(() => buildBooking(12, values, availability)).toThrow();
  expect(() =>
    buildBooking(
      12,
      { '5': '3' },
      availability.map((a) => ({ ...a, availableQuantity: 2 })),
    ),
  ).toThrow();
});
it('converts additional cancellations to cumulative booking item targets', () => {
  const booking = decodeBooking(parseJson(JSON.stringify(bookingFixture(3, 1))));
  expect(buildCancellation(booking, { '20': '1' })).toEqual({
    items: [{ bookingItemId: 20, cancelledQuantity: 2 }],
  });
  expect(() => buildCancellation(booking, { '20': '0' })).toThrow();
  expect(() => buildCancellation(booking, { '20': '3' })).toThrow();
  expect(() => buildCancellation(booking, { '5': '1' })).toThrow();
});
