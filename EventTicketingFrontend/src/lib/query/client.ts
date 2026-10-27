import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors';
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error) =>
          count < 1 &&
          error instanceof ApiError &&
          (error.kind === 'transport' || (error.kind === 'http' && (error.status ?? 0) >= 500)),
        staleTime: 30000,
      },
      mutations: { retry: false, networkMode: 'always', gcTime: 0 },
    },
  });
}
export const queryClient = makeQueryClient();
