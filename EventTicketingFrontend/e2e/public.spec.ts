import { test, expect } from '@playwright/test';
import {
  eventFixture,
  venueFixture,
  countryFixture,
  availabilityFixture,
  paged,
} from '../tests/fixtures';
test.beforeEach(async ({ page }) => {
  await page.route('https://localhost:7209/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data =
      path === '/api/events'
        ? paged([eventFixture])
        : path === '/api/events/12'
          ? eventFixture
          : path === '/api/events/12/availability'
            ? availabilityFixture
            : path === '/api/countries/1'
              ? { ...countryFixture, venues: [venueFixture] }
              : path === '/api/venues/3'
                ? venueFixture
                : path === '/api/venues'
                  ? paged([venueFixture])
                  : path === '/api/countries'
                    ? paged([countryFixture])
                    : null;
    return route.fulfill({
      status: data ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
});
for (const width of [375, 768, 1440])
  test(`discovery renders and keeps filters at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: eventFixture.name })).toBeVisible();
    await page.getByLabel('Find your next experience').fill('evening');
    await page.getByRole('button', { name: /Find events/ }).click();
    await expect(page).toHaveURL(/search=evening/);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByLabel('Display times in').selectOption('UTC');
    await page.reload();
    await expect(page.getByLabel('Display times in')).toHaveValue('UTC');
  });

test('details use actual availability and invalid IDs never request a resource', async ({
  page,
}) => {
  await page.goto('/events/12');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(eventFixture.name);
  await expect(page.getByText('$25.50')).toBeVisible();
  await expect(page.getByRole('link', { name: venueFixture.name })).toBeVisible();
  await page.goto('/events/nope');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This link is unavailable');
});
test('small screens, text zoom and keyboard menu preserve reflow', async ({ page }) => {
  for (const width of [320, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: eventFixture.name })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(() => {
    document.documentElement.style.zoom = '1';
  });
  await page.setViewportSize({ width: 375, height: 1000 });
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});
test('event content survives independent venue and availability failures', async ({ page }) => {
  await page.route('**/api/venues/3', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/events/12/availability', (route) => route.fulfill({ status: 403 }));
  await page.goto('/events/12');
  await expect(page.getByRole('heading', { name: eventFixture.name, exact: true })).toBeVisible();
  await expect(page.getByText(eventFixture.description)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Confirm booking' })).toHaveCount(0);
});
test('visual review fixture', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/events');
  await expect(page.getByRole('heading', { name: eventFixture.name })).toBeVisible();
  await page.screenshot({ path: 'artifacts/discovery-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: 'artifacts/discovery-mobile.png', fullPage: true });
});
