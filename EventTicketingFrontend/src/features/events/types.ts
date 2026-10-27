import { record, integer, string, nullableString } from '../../lib/api/json-codec';
import { eventUtc } from '../../utils/date-time';
export interface EventDto {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  capacity: number;
  venueId: number;
}
export interface EventWrite {
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  capacity: number;
  venueId: number;
}
export function decodeEvent(value: unknown): EventDto {
  const o = record(value);
  return {
    id: integer(o.id, 1),
    name: string(o.name),
    description: nullableString(o.description),
    startDate: eventUtc(string(o.startDate)),
    endDate: eventUtc(string(o.endDate)),
    capacity: integer(o.capacity, 1),
    venueId: integer(o.venueId, 1),
  };
}
