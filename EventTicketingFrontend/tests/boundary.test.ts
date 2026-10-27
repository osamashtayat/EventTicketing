import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from '../src/lib/api/client';
import { encodeJson, money, parseJson, record, wireMoney } from '../src/lib/api/json-codec';
import { queryString } from '../src/lib/api/query-params';
import { httpError } from '../src/lib/api/errors';
import { estimate, formatMoney } from '../src/utils/money';
import { eventUtc, canCancel } from '../src/utils/date-time';
import { decodeEvent } from '../src/features/events/types';
import { decodeAvailability } from '../src/features/ticket-categories/types';
describe('exact contract boundary', () => {
  it('round trips max price, cents, zero and exponent tokens', () => {
    for (const token of ['9999999999999999.99', '25.50', '0', '2.55e1']) {
      const parsed = money(record(parseJson(`{"price":${token}}`)).price);
      expect(money(record(parseJson(encodeJson({ price: wireMoney(parsed) }))).price)).toBe(parsed);
    }
    expect(estimate([{ price: money('9999999999999999.99'), quantity: 20 }])).toBe(
      '199999999999999999.80',
    );
    expect(formatMoney(money('9999999999999999.99'))).toBe('$9,999,999,999,999,999.99');
    expect(() => money('0.001')).toThrow();
  });
  it('repairs event UTC only and honors inclusive cancellation cutoff', () => {
    expect(eventUtc('2030-06-01T12:00:00')).toBe('2030-06-01T12:00:00.000Z');
    expect(eventUtc('2030-06-01T14:00:00+02:00')).toBe('2030-06-01T12:00:00.000Z');
    const cutoff = Date.parse('2030-05-31T12:00:00Z');
    expect(canCancel('2030-06-01T12:00:00Z', cutoff)).toBe(true);
    expect(canCancel('2030-06-01T12:00:00Z', cutoff + 1)).toBe(false);
  });
  it('preserves zero, encodes offsets and omits empty filters', () =>
    expect(
      queryString({
        status: 0,
        minPrice: '0.00',
        startFrom: '2030-01-01T00:00:00+02:00',
        search: 'two words',
        city: '',
      }),
    ).toBe('status=0&minPrice=0.00&startFrom=2030-01-01T00%3A00%3A00%2B02%3A00&search=two+words'));
  it('rejects incorrect required read fields', () => {
    expect(() => decodeEvent({ id: 1 })).toThrow();
    expect(() => decodeAvailability({ currency: 'EUR' })).toThrow();
  });
  it.each([200, 201, 204])('accepts expected empty %s successes', async (status) => {
    const client = createApiClient(
      'https://api.test',
      undefined,
      vi.fn().mockResolvedValue(new Response(null, { status })),
    );
    await expect(client.void('/resource', { method: 'POST', body: {} })).resolves.toBeUndefined();
  });
  it('rejects malformed required successes and distinguishes network failure', async () => {
    for (const body of ['', '{broken']) {
      const client = createApiClient(
        'https://api.test',
        undefined,
        vi.fn().mockResolvedValue(new Response(body)),
      );
      await expect(client.request('/events', decodeEvent)).rejects.toMatchObject({
        kind: 'contract',
        status: 200,
      });
    }
    const client = createApiClient(
      'https://api.test',
      undefined,
      vi.fn().mockRejectedValue(new TypeError('network')),
    );
    await expect(client.request('/events', decodeEvent)).rejects.toMatchObject({
      kind: 'transport',
    });
  });
  it.each([401, 403, 409, 500])('normalizes bodyless %s', (status) =>
    expect(httpError(status, undefined)).toMatchObject({ kind: 'http', status }),
  );
  it('retains array codes and nested validation keys, safely hides 500 detail', () => {
    expect(
      httpError(409, {
        errors: [{ code: 'Booking.InsufficientAvailability', description: 'Not enough.' }],
      }).issues[0]?.code,
    ).toBe('Booking.InsufficientAvailability');
    expect(httpError(400, { errors: { 'Items[0].Quantity': ['Invalid'] } }).fields).toEqual({
      'Items[0].Quantity': ['Invalid'],
    });
    expect(httpError(500, { detail: 'database secret', errors: null }).message).not.toContain(
      'secret',
    );
    expect(httpError(400, { errors: [] })).toBeInstanceOf(Error);
  });
  it('passes read cancellation through', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockImplementation((_url, init: RequestInit) => {
      expect(init.signal).toBe(controller.signal);
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });
    await expect(
      createApiClient('https://api.test', undefined, fetcher).request('/x', (v) => v, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
it('rejects calendar normalization and incompatible numeric fields', () => {
  expect(() => eventUtc('2030-02-30T12:00:00')).toThrow();
  expect(() =>
    decodeAvailability(
      parseJson(
        '{"ticketCategoryId":5,"name":"Tier","price":"25.50","currency":"USD","capacity":10,"bookedQuantity":0,"availableQuantity":10}',
      ),
    ),
  ).toThrow();
});
