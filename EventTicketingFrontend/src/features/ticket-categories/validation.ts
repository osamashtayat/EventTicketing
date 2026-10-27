import { money } from '../../lib/api/json-codec';
import { cents } from '../../utils/money';
import { positiveInteger, requiredText } from '../../utils/form-values';
import type { CategoryWrite } from './types';
export interface CategoryValues {
  name: string;
  description: string;
  price: string;
  capacity: string;
  eventId: string;
}
export function categoryBody(values: CategoryValues): CategoryWrite {
  if (!/^\d+(?:\.\d{1,2})?$/.test(values.price))
    throw new Error('Enter a nonnegative USD price with at most two decimal places.');
  const price = money(values.price);
  if (cents(price) > 999999999999999999n)
    throw new Error('Price exceeds the API maximum of 9999999999999999.99 USD.');
  return {
    name: requiredText(values.name, 'Category name'),
    description: values.description.trim() || null,
    price,
    capacity: positiveInteger(values.capacity, 'Capacity'),
    eventId: positiveInteger(values.eventId, 'Event ID'),
  };
}
