import { record, integer, string, nullableString } from '../../lib/api/json-codec';
export interface VenueSummary {
  id: number;
  name: string;
  city: string;
  countryId: number;
  address: string | null;
}
export interface VenueWrite {
  name: string;
  city: string;
  countryId: number;
  capacity: number;
  address: string;
}
export function decodeVenue(value: unknown): VenueSummary {
  const o = record(value);
  return {
    id: integer(o.id, 1),
    name: string(o.name),
    city: string(o.city),
    countryId: integer(o.countryId, 1),
    address: nullableString(o.address),
  };
}
