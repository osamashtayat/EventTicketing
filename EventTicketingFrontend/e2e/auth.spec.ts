import { test, expect } from '@playwright/test';
import { paged, eventFixture, venueFixture, countryFixture } from '../tests/fixtures';
test('sign in uses /me roles, local sign out and reload isolation', async ({ page }) => {
  await page.route('https://localhost:7209/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const data =
      path === '/api/auth/login'
        ? {
            tokenType: 'Bearer',
            accessToken: 'fixture-opaque-access',
            refreshToken: 'fixture-refresh',
            expiresIn: 3600,
          }
        : path === '/api/auth/me'
          ? { id: 'fixture-user', email: null, firstName: '', lastName: '', roles: ['FutureRole'] }
          : path === '/api/events'
            ? paged([eventFixture])
            : path === '/api/venues/3'
              ? venueFixture
              : path === '/api/countries'
                ? paged([countryFixture])
                : path === '/api/venues'
                  ? paged([venueFixture])
                  : null;
    return route.fulfill({
      status: data ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  await page.goto('/sign-in?returnTo=%2Faccount');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Fixture-1');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await expect(page.getByText('Name not provided')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage', exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
  ).not.toContain('fixture-opaque');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
});
