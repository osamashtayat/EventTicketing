import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeAll, afterAll, afterEach, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { configureApi } from '../src/lib/api/client';
import { makeQueryClient } from '../src/lib/query/client';
import { EventDiscoveryPage } from '../src/app/pages/EventDiscoveryPage';
import { eventFixture, venueFixture, countryFixture, paged } from './fixtures';
import { readPreference } from '../src/stores/display-preferences';
const requests: URL[] = [];
const server = setupServer(
  http.get('https://api.test/api/events', ({ request }) => {
    requests.push(new URL(request.url));
    return HttpResponse.json(paged([eventFixture]));
  }),
  http.get('https://api.test/api/venues/3', () => HttpResponse.json(venueFixture)),
  http.get('https://api.test/api/venues', () => HttpResponse.json(paged([venueFixture]))),
  http.get('https://api.test/api/countries', () => HttpResponse.json(paged([countryFixture]))),
);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
it('uses URL filters, clears incompatible venue on country change and avoids availability fanout', async () => {
  configureApi('https://api.test');
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/events?search=evening&countryId=1&venueId=3']}>
        <EventDiscoveryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect((await screen.findAllByText(eventFixture.name))[0]).toBeInTheDocument();
  expect(requests[0]?.searchParams.get('search')).toBe('evening');
  fireEvent.click(screen.getByText(/Refine your search/));
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: '' } });
  expect(screen.getByLabelText('Venue')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Find your next experience'), {
    target: { value: 'two words' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Find events/ }));
  await waitFor(() => expect(requests.at(-1)?.searchParams.get('search')).toBe('two words'));
  expect(requests.at(-1)?.searchParams.has('venueId')).toBe(false);
});
it('tolerates corrupt or unavailable preference storage', () => {
  expect(readPreference({ getItem: () => '{broken' })).toBe('local');
  expect(
    readPreference({
      getItem: () => {
        throw new Error('blocked');
      },
    }),
  ).toBe('local');
  expect(readPreference({ getItem: () => '{"version":1,"timeDisplay":"UTC"}' })).toBe('UTC');
});
