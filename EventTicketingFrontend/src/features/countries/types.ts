import type { VenueSummary } from '../venues/public';
import { record, integer, string } from '../../lib/api/json-codec';
export interface CountrySummary {
  id: number;
  name: string;
  shortName: string;
}
export interface CountryWrite {
  name: string;
  shortName: string;
}
export function decodeCountrySummary(value: unknown): CountrySummary {
  const o = record(value);
  return { id: integer(o.id, 1), name: string(o.name), shortName: string(o.shortName) };
}
export interface CountryDetail extends CountrySummary {
  venues: VenueSummary[];
}
