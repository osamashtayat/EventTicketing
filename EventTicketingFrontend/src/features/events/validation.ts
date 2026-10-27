import { positiveInteger, requiredText } from '../../utils/form-values';
import { inputUtc } from '../../utils/date-time';
import type { EventWrite } from './types';
export interface EventValues {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: string;
  venueId: string;
}
export function eventBody(values: EventValues): EventWrite {
  const startDate = inputUtc(requiredText(values.startDate, 'Start date'));
  const endDate = inputUtc(requiredText(values.endDate, 'End date'));
  if (Date.parse(endDate) <= Date.parse(startDate))
    throw new Error('End date must be after the start date.');
  return {
    name: requiredText(values.name, 'Event name'),
    description: values.description.trim() || null,
    startDate,
    endDate,
    capacity: positiveInteger(values.capacity, 'Capacity'),
    venueId: positiveInteger(values.venueId, 'Venue'),
  };
}
