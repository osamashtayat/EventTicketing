import { ApiError } from '../lib/api/errors';
export type TimeDisplay = 'local' | 'UTC';
export function eventUtc(value: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})?$/;
  if (!iso.test(value)) throw new ApiError('contract', 'Invalid event timestamp.');
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const days =
    month === 2
      ? year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
        ? 29
        : 28
      : [4, 6, 9, 11].includes(month)
        ? 30
        : 31;
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days ||
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    Number(value.slice(17, 19)) > 59
  )
    throw new ApiError('contract', 'Invalid event calendar date.');
  const result = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  if (!Number.isFinite(Date.parse(result)))
    throw new ApiError('contract', 'Invalid event timestamp.');
  return new Date(result).toISOString();
}
export function offsetTimestamp(value: string): string {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new ApiError('contract', 'Expected an offset timestamp.');
  return value;
}
export function formatTime(value: string, mode: TimeDisplay): string {
  return (
    new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(mode === 'UTC' ? { timeZone: 'UTC' } : {}),
    }).format(new Date(value)) +
    ` (${mode === 'UTC' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone})`
  );
}
export function dateMotif(value: string, mode: TimeDisplay) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    ...(mode === 'UTC' ? { timeZone: 'UTC' } : {}),
  }).format(new Date(value));
}
export function utcInput(value: string): string {
  return eventUtc(value).slice(0, -1);
}
export function inputUtc(value: string): string {
  return eventUtc(`${value.length === 16 ? value + ':00' : value}Z`);
}
export function cancellationDeadline(start: string): string {
  return new Date(Date.parse(start) - 86400000).toISOString();
}
export function canCancel(start: string, now = Date.now()): boolean {
  return now <= Date.parse(cancellationDeadline(start));
}
