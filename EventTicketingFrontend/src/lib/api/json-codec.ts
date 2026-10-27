import { parse, stringify, LosslessNumber, isLosslessNumber } from 'lossless-json';
import { ApiError, isRecord } from './errors';
import type { MoneyAmount, Page } from './types';
export const parseJson = (text: string): unknown => parse(text);
export function encodeJson(value: unknown): string {
  const result = stringify(value);
  if (typeof result !== 'string') throw new ApiError('contract', 'Cannot encode request.');
  return result;
}
export function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value) || isLosslessNumber(value))
    throw new ApiError('contract', 'Expected an object from the API.');
  return value;
}
export function string(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError('contract', 'Expected text from the API.');
  return value;
}
export function nullableString(value: unknown): string | null {
  return value === null ? null : string(value);
}
export function integer(value: unknown, min = 0, max = 2147483647): number {
  if (isLosslessNumber(value) && !/^-?\d+$/.test(value.value))
    throw new ApiError('contract', 'Expected an integer JSON token.');
  const number = isLosslessNumber(value) ? Number(value.value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < min || number > max)
    throw new ApiError('contract', 'Expected a valid integer from the API.');
  return number;
}
export function array<T>(value: unknown, decode: (value: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new ApiError('contract', 'Expected a list from the API.');
  return value.map(decode);
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean')
    throw new ApiError('contract', 'Expected a boolean from the API.');
  return value;
}
export function page<T>(value: unknown, decode: (value: unknown) => T): Page<T> {
  const o = record(value);
  return {
    items: array(o.items, decode),
    totalCount: integer(o.totalCount),
    pageNumber: integer(o.pageNumber, 1),
    pageSize: integer(o.pageSize, 1, 100),
    totalPages: integer(o.totalPages),
    hasNextPage: boolean(o.hasNextPage),
    hasPreviousPage: boolean(o.hasPreviousPage),
  };
}
export function money(value: unknown): MoneyAmount {
  const token = isLosslessNumber(value) ? value.value : typeof value === 'string' ? value : '';
  const match = /^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
  if (!match) throw new ApiError('contract', 'Expected a nonnegative exact monetary amount.');
  const whole = match[1] ?? '';
  const fraction = match[2] ?? '';
  const exponent = Number(match[3] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100)
    throw new ApiError('contract', 'Monetary exponent is out of range.');
  const digits = whole + fraction;
  const point = whole.length + exponent;
  const expandedWhole = (point <= 0 ? '0' : digits.slice(0, point).padEnd(point, '0')).replace(
    /^0+(?=\d)/,
    '',
  );
  const expandedFraction = point < 0 ? '0'.repeat(-point) + digits : digits.slice(point);
  if (expandedFraction.slice(2).replace(/0/g, ''))
    throw new ApiError('contract', 'Monetary values must have exact cents.');
  // The brand is introduced only after validating and canonicalizing the decimal token.
  return `${expandedWhole}.${expandedFraction.slice(0, 2).padEnd(2, '0')}` as MoneyAmount;
}
export function wireMoney(value: MoneyAmount): LosslessNumber {
  return new LosslessNumber(money(value));
}

export function decodeMoney(value: unknown): MoneyAmount {
  if (!isLosslessNumber(value))
    throw new ApiError('contract', 'Expected a numeric monetary JSON token.');
  return money(value);
}
