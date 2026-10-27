import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { App } from '../src/app/App';
import { configureApi } from '../src/lib/api/client';
it('renders an actionable unavailable API state in the public shell', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
  configureApi('https://api.test');
  render(<App />);
  expect(screen.getByRole('link', { name: /Encore/ })).toBeInTheDocument();
  expect((await screen.findAllByRole('alert', {}, { timeout: 3000 }))[0]).toHaveTextContent(
    'Could not reach the API',
  );
});
