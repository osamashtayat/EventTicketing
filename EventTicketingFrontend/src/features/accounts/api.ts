import { api } from '../../lib/api/client';
import type { AccountValues } from './types';
export const createAccount = (body: AccountValues) =>
  api.void('/api/accounts', { method: 'POST', body, protected: true });
