import { ApiError, httpError } from './errors';
import { encodeJson, parseJson } from './json-codec';
import { queryString } from './query-params';
import type { Params } from './types';
export interface AuthTransport {
  generation: () => number;
  token: () => string | undefined;
  prepare: () => Promise<void>;
  refresh: () => Promise<void>;
}
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Params;
  signal?: AbortSignal | undefined;
  protected?: boolean;
}
export function createApiClient(
  baseUrl: string,
  auth?: AuthTransport,
  fetcher: typeof fetch = fetch,
) {
  async function request<T>(
    path: string,
    decode: (value: unknown) => T,
    options: RequestOptions = {},
  ): Promise<T> {
    const method = options.method ?? 'GET';
    const generation = auth?.generation();
    if (options.protected) {
      if (!auth?.token()) throw httpError(401, null);
      await auth.prepare();
    }
    const assertSession = () => {
      if (options.protected && auth?.generation() !== generation)
        throw new DOMException('Session changed. Please check your bookings.', 'AbortError');
    };
    async function send(): Promise<Response> {
      assertSession();
      const headers = new Headers({ Accept: 'application/json' });
      if (options.body !== undefined) headers.set('Content-Type', 'application/json');
      const token = options.protected ? auth?.token() : undefined;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const query = options.params ? queryString(options.params) : '';
      try {
        return await fetcher(
          `${baseUrl}${path}${query ? `${path.includes('?') ? '&' : '?'}${query}` : ''}`,
          {
            method,
            headers,
            credentials: 'omit',
            cache: options.protected ? 'no-store' : 'default',
            signal: options.signal ?? null,
            ...(options.body === undefined ? {} : { body: encodeJson(options.body) }),
          },
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        throw new ApiError(
          'transport',
          'Could not reach the API. Check that it is running, the HTTPS certificate is trusted and this frontend origin is allowed.',
        );
      }
    }
    let response = await send();
    if (response.status === 401 && options.protected && method === 'GET' && auth) {
      await auth.refresh();
      assertSession();
      response = await send();
    }
    let raw: string;
    try {
      raw = await response.text();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError('transport', 'The connection ended before the API response was received.');
    }
    assertSession();
    let body: unknown;
    try {
      body = raw.trim() ? parseJson(raw) : undefined;
    } catch {
      if (response.ok)
        throw new ApiError('contract', 'The API returned an invalid response.', response.status);
    }
    if (!response.ok) throw httpError(response.status, body);
    try {
      return decode(body);
    } catch (error) {
      if (error instanceof ApiError) throw new ApiError('contract', error.message, response.status);
      throw new ApiError(
        'contract',
        'The API response did not match the expected contract.',
        response.status,
      );
    }
  }
  return {
    request,
    void: (path: string, options: RequestOptions) => request(path, () => undefined, options),
  };
}
let configured: ReturnType<typeof createApiClient> | undefined;
export function configureApi(base: string, auth?: AuthTransport) {
  configured = createApiClient(base, auth);
}
function client() {
  if (!configured) throw new Error('API client has not been configured.');
  return configured;
}
export const api = {
  request<T>(path: string, decode: (value: unknown) => T, options: RequestOptions = {}) {
    return client().request(path, decode, options);
  },
  void(path: string, options: RequestOptions) {
    return client().void(path, options);
  },
};
