export const eventFixture = {
  id: 12,
  name: 'An evening of possibility',
  description: 'A gathering for curious minds. Come along and be part of the moment.',
  startDate: '2030-11-10T19:00:00',
  endDate: '2030-11-10T22:00:00',
  capacity: 100,
  venueId: 3,
};
export const venueFixture = {
  id: 3,
  name: 'The Assembly Hall',
  city: 'Amman',
  countryId: 1,
  address: 'Cultural District',
};
export const countryFixture = { id: 1, name: 'Jordan', shortName: 'JO' };
export const availabilityFixture = [
  {
    ticketCategoryId: 5,
    name: 'General admission',
    price: 25.5,
    currency: 'USD',
    capacity: 100,
    bookedQuantity: 2,
    availableQuantity: 98,
  },
];
export function paged<T>(items: T[], pageNumber = 1, totalCount = items.length, pageSize = 10) {
  return {
    items,
    totalCount,
    pageNumber,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    hasNextPage: pageNumber < Math.ceil(totalCount / pageSize),
    hasPreviousPage: pageNumber > 1,
  };
}
export function bookingFixture(quantity = 2, cancelled = 0) {
  return {
    id: 44,
    eventId: 12,
    status: cancelled === quantity ? 2 : cancelled ? 1 : 0,
    currency: 'USD',
    totalAmount: quantity * 25.5,
    createdAtUtc: '2026-10-27T12:00:00+00:00',
    cancelledAtUtc: cancelled === quantity ? '2026-10-27T13:00:00+00:00' : null,
    items: [
      {
        id: 20,
        ticketCategoryId: 5,
        categoryName: 'General admission',
        quantity,
        cancelledQuantity: cancelled,
        remainingQuantity: quantity - cancelled,
        unitPrice: 25.5,
        originalAmount: quantity * 25.5,
        cancelledAmount: cancelled * 25.5,
        remainingAmount: (quantity - cancelled) * 25.5,
      },
    ],
    cancelledAmount: cancelled * 25.5,
    remainingAmount: (quantity - cancelled) * 25.5,
  };
}
