import { paging, positiveId, textFilter } from '../../lib/api/query-params';
import type { Params } from '../../lib/api/types';
function dateFilter(value: string | null): string | undefined {
  if (!value || !Number.isFinite(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}
export function eventFilters(params: URLSearchParams): Params {
  return {
    ...paging(params),
    search: textFilter(params.get('search')),
    countryId: positiveId(params.get('countryId')),
    venueId: positiveId(params.get('venueId')),
    city: textFilter(params.get('city')),
    startFrom: dateFilter(params.get('startFrom')),
    startTo: dateFilter(params.get('startTo')),
  };
}
