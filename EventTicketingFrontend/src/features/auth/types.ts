import { ApiError } from '../../lib/api/errors';
import { record, string, integer, nullableString, array } from '../../lib/api/json-codec';
export interface Tokens {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export interface CurrentUser {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  roles: string[];
}
export interface LoginValues {
  email: string;
  password: string;
  twoFactorCode?: string;
  twoFactorRecoveryCode?: string;
}
export interface RegisterValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
export function decodeTokens(value: unknown): Tokens {
  const o = record(value);
  if (
    o.tokenType !== 'Bearer' ||
    typeof o.accessToken !== 'string' ||
    !o.accessToken ||
    typeof o.refreshToken !== 'string' ||
    !o.refreshToken
  )
    throw new ApiError('contract', 'Expected opaque bearer credentials from the API.');
  return {
    tokenType: string(o.tokenType),
    accessToken: string(o.accessToken),
    refreshToken: string(o.refreshToken),
    expiresIn: integer(o.expiresIn, 1),
  };
}
export function decodeUser(value: unknown): CurrentUser {
  const o = record(value);
  return {
    id: string(o.id),
    email: nullableString(o.email),
    firstName: string(o.firstName),
    lastName: string(o.lastName),
    roles: array(o.roles, string),
  };
}
