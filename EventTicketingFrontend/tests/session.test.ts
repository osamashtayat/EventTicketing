import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { configureApi, api } from '../src/lib/api/client';
import { authTransport, signIn, logout, refreshSession } from '../src/app/session';
import { vault } from '../src/lib/auth/session-vault';
import { queryClient } from '../src/lib/query/client';
import { keys } from '../src/lib/query/keys';
import { safeReturn } from '../src/app/pages/AuthPages';
const tokens = {
  tokenType: 'Bearer',
  accessToken: 'opaque-test-access',
  refreshToken: 'opaque-test-refresh',
  expiresIn: 3600,
};
const values = { email: 'fixture@example.test', password: 'Fixture-1' };
function deferred<T>() {
  let resolve: (v: T) => void = () => {
    throw new Error('Uninitialized deferred.');
  };
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(logout);
afterEach(() => {
  logout();
  vi.restoreAllMocks();
});
it('coalesces refresh and replaces both opaque tokens', async () => {
  const pending = deferred<Response>();
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json(tokens))
    .mockImplementationOnce(() => pending.promise);
  configureApi('https://api.test', authTransport);
  await signIn(values);
  const one = refreshSession();
  const two = refreshSession();
  pending.resolve(Response.json({ ...tokens, accessToken: 'next', refreshToken: 'next-refresh' }));
  await Promise.all([one, two]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(vault.token()).toBe('next');
  expect(vault.credentials()?.refreshToken).toBe('next-refresh');
});
it('logout during refresh cannot restore the session', async () => {
  const pending = deferred<Response>();
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json(tokens))
    .mockImplementationOnce(() => pending.promise);
  configureApi('https://api.test', authTransport);
  await signIn(values);
  const refresh = refreshSession();
  logout();
  pending.resolve(Response.json(tokens));
  await expect(refresh).rejects.toMatchObject({ name: 'AbortError' });
  expect(vault.token()).toBeUndefined();
});
it('suppresses late private reads and removes private cache on replacement', async () => {
  const pending = deferred<Response>();
  vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json(tokens))
    .mockImplementationOnce(() => pending.promise);
  configureApi('https://api.test', authTransport);
  await signIn(values);
  queryClient.setQueryData(keys.booking(vault.generation(), 1), { private: 'fixture' });
  const read = api.request('/api/bookings/1', (v) => v, { protected: true });
  await Promise.resolve();
  logout();
  pending.resolve(Response.json({ id: 1 }));
  await expect(read).rejects.toMatchObject({ name: 'AbortError' });
  expect(queryClient.getQueriesData({ queryKey: keys.private })).toHaveLength(0);
});
it('refreshes once for a safe GET and never replays a write after 401', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json(tokens))
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ ...tokens, accessToken: 'next' }))
    .mockResolvedValueOnce(Response.json({ id: 1 }))
    .mockResolvedValueOnce(new Response(null, { status: 401 }));
  configureApi('https://api.test', authTransport);
  await signIn(values);
  await expect(api.request('/read', (v) => v, { protected: true })).resolves.toBeDefined();
  await expect(
    api.request('/write', (v) => v, { method: 'POST', body: {}, protected: true }),
  ).rejects.toMatchObject({ status: 401 });
  expect(fetcher).toHaveBeenCalledTimes(5);
});
it('does not loop on refresh transport failure and ends session on rejected refresh', async () => {
  const fetcher = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json(tokens))
    .mockRejectedValueOnce(new TypeError('offline'));
  configureApi('https://api.test', authTransport);
  await signIn(values);
  await expect(refreshSession()).rejects.toMatchObject({ kind: 'transport' });
  await expect(refreshSession()).rejects.toMatchObject({ kind: 'transport' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  fetcher.mockResolvedValueOnce(new Response(null, { status: 401 }));
  await expect(refreshSession(true)).rejects.toMatchObject({ status: 401 });
  expect(vault.token()).toBeUndefined();
});
it('rejects external or malformed return URLs', () => {
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/unknown',
    'javascript:alert(1)',
  ])
    expect(safeReturn(value)).toBe('/events');
  expect(safeReturn('/bookings?eventId=12')).toBe('/bookings?eventId=12');
});
