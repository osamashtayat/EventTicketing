import { api } from '../../lib/api/client';
import { decodeTokens, decodeUser } from './types';
import type { LoginValues, RegisterValues } from './types';
export const login = (body: LoginValues) =>
  api.request('/api/auth/login?useCookies=false', decodeTokens, { method: 'POST', body });
export const refreshTokens = (refreshToken: string) =>
  api.request('/api/auth/refresh', decodeTokens, { method: 'POST', body: { refreshToken } });
export const register = (body: RegisterValues) =>
  api.void('/api/auth/register', { method: 'POST', body });
export const getMe = (signal?: AbortSignal) =>
  api.request('/api/auth/me', decodeUser, { protected: true, signal });
