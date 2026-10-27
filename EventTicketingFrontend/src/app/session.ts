import { vault } from '../lib/auth/session-vault';
import { queryClient } from '../lib/query/client';
import { keys } from '../lib/query/keys';
import { ApiError } from '../lib/api/errors';
import { login, refreshTokens } from '../features/auth/public';
import type { LoginValues, Tokens } from '../features/auth/public';
let inFlight: Promise<void> | undefined;
let refreshFailure: unknown;
export function logout() {
  void queryClient.cancelQueries({ queryKey: keys.private });
  queryClient.removeQueries({ queryKey: keys.private });
  queryClient.getMutationCache().clear();
  inFlight = undefined;
  refreshFailure = undefined;
  vault.clear();
}
function install(tokens: Tokens, generation: number) {
  vault.install(
    {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    },
    generation,
  );
}
export async function signIn(values: LoginValues): Promise<void> {
  logout();
  const generation = vault.generation();
  const tokens = await login(values);
  install(tokens, generation);
}
export async function refreshSession(explicit = false): Promise<void> {
  if (explicit) refreshFailure = undefined;
  if (refreshFailure) throw refreshFailure;
  if (inFlight) return inFlight;
  const generation = vault.generation();
  const current = vault.credentials();
  if (!current) throw new ApiError('http', 'Please sign in to continue.', 401);
  const promise = (async () => {
    try {
      const tokens = await refreshTokens(current.refreshToken);
      install(tokens, generation);
    } catch (error) {
      if (vault.generation() === generation) {
        if (error instanceof ApiError && error.status === 401) logout();
        else refreshFailure = error;
      }
      throw error;
    } finally {
      if (vault.generation() === generation) inFlight = undefined;
    }
  })();
  inFlight = promise;
  return promise;
}
export async function prepareSession() {
  const current = vault.credentials();
  if (!current) throw new ApiError('http', 'Please sign in to continue.', 401);
  if (current.expiresAt - Date.now() < 30000) await refreshSession();
}
export const authTransport = {
  generation: vault.generation,
  token: vault.token,
  prepare: prepareSession,
  refresh: () => refreshSession(),
};
