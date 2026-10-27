import { test, expect } from '@playwright/test';
import { countryFixture, paged } from '../tests/fixtures';
test('admin country edit accepts 204 and delete conflicts preserve the dialog', async ({
  page,
}) => {
  let country = { ...countryFixture };
  let updateBody: unknown;
  await page.route('https://localhost:7209/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === '/api/countries/1' && req.method() === 'PUT') {
      updateBody = req.postDataJSON();
      country = { ...country, name: 'Jordan updated' };
      return route.fulfill({ status: 204 });
    }
    if (path === '/api/countries/1' && req.method() === 'DELETE')
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ code: 'Country.HasVenues', description: 'This country has venues.' }],
        }),
      });
    const data =
      path === '/api/auth/login'
        ? { tokenType: 'Bearer', accessToken: 'fixture', refreshToken: 'refresh', expiresIn: 3600 }
        : path === '/api/auth/me'
          ? {
              id: 'admin-fixture',
              email: 'admin@example.test',
              firstName: 'Admin',
              lastName: 'Test',
              roles: ['Admin'],
            }
          : path === '/api/countries'
            ? paged([country])
            : null;
    return route.fulfill({
      status: data ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  await page.goto('/sign-in?returnTo=%2Fmanage%2Fcountries');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-1');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Manage countries' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit Jordan', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Country name', { exact: true }).fill('Jordan updated');
  await dialog.getByRole('button', { name: 'Save country' }).click();
  await expect(dialog).toBeHidden();
  expect(updateBody).toEqual({ name: 'Jordan updated', shortName: 'JO', id: 1 });
  await page.getByRole('button', { name: 'Delete Jordan updated', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('This country has venues.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
test('organizer workspace requires protected history and writes an exact numeric category price', async ({
  page,
}) => {
  let written: string | null = null;
  const requests: string[] = [];
  await page.route('https://localhost:7209/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    requests.push(path);
    if (path === '/api/ticket-categories/5' && req.method() === 'PUT') {
      written = req.postData();
      return route.fulfill({ status: 200, contentType: 'application/json', body: written ?? '' });
    }
    const data =
      path === '/api/auth/login'
        ? { tokenType: 'Bearer', accessToken: 'fixture', refreshToken: 'refresh', expiresIn: 3600 }
        : path === '/api/auth/me'
          ? {
              id: 'organizer-fixture',
              email: 'organizer@example.test',
              firstName: 'Organizer',
              lastName: 'Test',
              roles: ['EventOrganizer'],
            }
          : path === '/api/events/12/bookings'
            ? paged([])
            : path === '/api/events/12'
              ? {
                  id: 12,
                  name: 'Workspace event',
                  description: null,
                  startDate: '2030-11-10T19:00:00',
                  endDate: '2030-11-10T22:00:00',
                  capacity: 100,
                  venueId: 3,
                }
              : path === '/api/venues'
                ? paged([{ id: 3, name: 'Hall', city: 'Amman', address: null, countryId: 1 }])
                : path === '/api/ticket-categories'
                  ? paged([
                      {
                        id: 5,
                        name: 'VIP',
                        description: null,
                        price: 25.5,
                        capacity: 50,
                        eventId: 12,
                      },
                    ])
                  : null;
    return route.fulfill({
      status: data ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  await page.goto('/sign-in?returnTo=%2Fmanage%2Fevents%2F12');
  await page.getByLabel('Email', { exact: true }).fill('organizer@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-1');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workspace event', exact: true })).toBeVisible();
  expect(requests).toContain('/api/events/12/bookings');
  await page.getByRole('button', { name: 'Edit VIP', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Unit price (USD)').fill('9999999999999999.99');
  await page.getByRole('dialog').getByRole('button', { name: 'Save category' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(written).toContain('"price":9999999999999999.99');
  await page
    .getByRole('navigation', { name: 'Management' })
    .getByRole('link', { name: 'Events', exact: true })
    .click();
  await expect(page.getByText(/does not provide a list of your owned events/)).toBeVisible();
  expect(requests).not.toContain('/api/events');
});
test('admin creates a new account with an empty 201 and clears the password', async ({ page }) => {
  let body: unknown;
  await page.route('https://localhost:7209/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/accounts') {
      body = route.request().postDataJSON();
      return route.fulfill({ status: 201 });
    }
    const data =
      path === '/api/auth/login'
        ? { tokenType: 'Bearer', accessToken: 'fixture', refreshToken: 'refresh', expiresIn: 3600 }
        : path === '/api/auth/me'
          ? {
              id: 'admin',
              email: 'admin@example.test',
              firstName: 'Admin',
              lastName: 'Test',
              roles: ['Admin'],
            }
          : null;
    return route.fulfill({
      status: data ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  await page.goto('/sign-in?returnTo=%2Fmanage%2Faccounts%2Fnew');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-1');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create an account');
  await page.getByLabel('First name').fill('New');
  await page.getByLabel('Last name').fill('Organizer');
  await page.getByLabel('Email', { exact: true }).fill('new@example.test');
  await page.getByLabel('Temporary password').fill('Fixture-2');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Account created. The temporary password has been cleared.',
  );
  await expect(page.getByLabel('Temporary password')).toHaveValue('');
  expect(body).toEqual({
    firstName: 'New',
    lastName: 'Organizer',
    email: 'new@example.test',
    password: 'Fixture-2',
    role: 'EventOrganizer',
  });
});
