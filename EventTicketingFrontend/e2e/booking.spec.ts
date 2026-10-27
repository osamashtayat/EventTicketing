import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  eventFixture,
  venueFixture,
  countryFixture,
  availabilityFixture,
  bookingFixture,
  paged,
} from '../tests/fixtures';
async function mockBookingApi(page: Page, uncertain = false) {
  let posts = 0;
  let payload: unknown;
  let booking = bookingFixture();
  await page.route('https://localhost:7209/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/bookings' && request.method() === 'POST') {
      posts++;
      payload = request.postDataJSON();
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (uncertain) return route.abort('failed');
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(booking),
      });
    }
    if (path === '/api/bookings/44/cancel') {
      const body: unknown = request.postDataJSON();
      let cancelled = 2;
      if (
        typeof body === 'object' &&
        body !== null &&
        'items' in body &&
        Array.isArray(body.items)
      ) {
        const item: unknown = body.items[0];
        if (
          typeof item === 'object' &&
          item !== null &&
          'cancelledQuantity' in item &&
          typeof item.cancelledQuantity === 'number'
        )
          cancelled = item.cancelledQuantity;
      }
      booking = bookingFixture(2, cancelled);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(booking),
      });
    }
    const data =
      path === '/api/auth/login'
        ? {
            tokenType: 'Bearer',
            accessToken: 'fixture-access',
            refreshToken: 'fixture-refresh',
            expiresIn: 3600,
          }
        : path === '/api/auth/me'
          ? {
              id: 'fixture-user',
              email: 'fixture@example.test',
              firstName: 'Test',
              lastName: 'User',
              roles: ['User'],
            }
          : path === '/api/events'
            ? paged([eventFixture])
            : path === '/api/events/12'
              ? eventFixture
              : path === '/api/events/12/availability'
                ? availabilityFixture
                : path === '/api/venues/3'
                  ? venueFixture
                  : path === '/api/countries'
                    ? paged([countryFixture])
                    : path === '/api/countries/1'
                      ? { ...countryFixture, venues: [venueFixture] }
                      : path === '/api/venues'
                        ? paged([venueFixture])
                        : path === '/api/bookings/44'
                          ? booking
                          : path === '/api/bookings/mine'
                            ? paged([booking])
                            : null;
    return route.fulfill({
      status: data ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  return { posts: () => posts, payload: () => payload };
}
async function chooseAndSignIn(page: Page) {
  await page.goto('/events/12');
  await page.getByLabel('Quantity for General admission').fill('2');
  await page.getByRole('button', { name: 'Sign in to book' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email', { exact: true }).fill('fixture@example.test');
  await dialog.getByLabel('Password', { exact: true }).fill('Fixture-1');
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('Quantity for General admission')).toHaveValue('2');
  await page.getByRole('button', { name: 'Review booking', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your booking' })).toBeVisible();
}
test('one deliberate confirmation sends one POST and displays server snapshots', async ({
  page,
}) => {
  const api = await mockBookingApi(page);
  await chooseAndSignIn(page);
  await page.getByRole('button', { name: 'Confirm booking', exact: true }).dblclick();
  await expect(page).toHaveURL('/bookings/44');
  await expect(page.getByRole('heading', { name: 'Booking confirmed' })).toBeVisible();
  expect(api.posts()).toBe(1);
  expect(api.payload()).toEqual({ eventId: 12, items: [{ ticketCategoryId: 5, quantity: 2 }] });
  await expect(page.getByRole('cell', { name: '$51.00', exact: true })).toBeVisible();
});
test('transport loss after submit keeps an uncertain outcome and does not retry', async ({
  page,
}) => {
  const api = await mockBookingApi(page, true);
  await chooseAndSignIn(page);
  await page.getByRole('button', { name: 'Confirm booking', exact: true }).click();
  await expect(
    page.getByText('We could not confirm the result. Check your bookings before trying again.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm booking', exact: true })).toHaveCount(0);
  expect(api.posts()).toBe(1);
});
export { mockBookingApi, chooseAndSignIn };
test('create, partial cancel, full cancel and history use server quantities', async ({ page }) => {
  await mockBookingApi(page);
  const bodies: unknown[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/bookings/44/cancel')) bodies.push(request.postDataJSON());
  });
  await chooseAndSignIn(page);
  await page.getByRole('button', { name: 'Confirm booking', exact: true }).click();
  await expect(page).toHaveURL('/bookings/44');
  await page.getByLabel('Additional tickets to cancel: General admission').fill('1');
  await page.getByRole('button', { name: 'Review partial cancellation' }).click();
  await expect(
    page.getByText('General admission: 1 cancelled in total, 1 remaining.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Confirm partial cancellation' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Partially cancelled');
  expect(bodies[0]).toEqual({ items: [{ bookingItemId: 20, cancelledQuantity: 1 }] });
  await page.getByRole('button', { name: 'Cancel all remaining tickets' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm full cancellation' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cancelled');
  expect(bodies[1]).toEqual({});
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'My bookings' })
    .click();
  await expect(page).toHaveURL('/bookings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My bookings');
  await expect(page.locator('.badge').filter({ hasText: 'Cancelled' })).toBeVisible();
});
test('uncertain creation remains visible when the inventory refresh becomes sold out', async ({
  page,
}) => {
  await mockBookingApi(page, true);
  let submitted = false;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/bookings') && request.method() === 'POST') submitted = true;
  });
  await page.route('**/api/events/12/availability', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        availabilityFixture.map((a) => ({
          ...a,
          availableQuantity: submitted ? 0 : 98,
          bookedQuantity: submitted ? 100 : 2,
        })),
      ),
    });
  });
  await chooseAndSignIn(page);
  await page.getByRole('button', { name: 'Confirm booking', exact: true }).click();
  await expect(
    page.getByText('We could not confirm the result. Check your bookings before trying again.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Check my bookings' })).toBeVisible();
});
