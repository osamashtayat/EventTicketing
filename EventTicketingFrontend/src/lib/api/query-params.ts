import type { Params } from './types';
export function queryString(params: Params): string {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') result.set(key, String(value));
  return result.toString();
}
export function positiveId(value: string | undefined | null): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : undefined;
}
export function paging(params: URLSearchParams) {
  const pageSize = Math.min(100, positiveId(params.get('pageSize')) ?? 10);
  const requested = positiveId(params.get('pageNumber')) ?? 1;
  return { pageNumber: (requested - 1) * pageSize <= 2147483647 ? requested : 1, pageSize };
}
export function textFilter(value: string | null): string | undefined {
  return value?.trim().slice(0, 200) || undefined;
}
