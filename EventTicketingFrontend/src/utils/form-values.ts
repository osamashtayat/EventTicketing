import { positiveId } from '../lib/api/query-params';
export function requiredText(value: string, label: string): string {
  const text = value.trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}
export function positiveInteger(value: string, label: string): number {
  const result = positiveId(value);
  if (result === undefined)
    throw new Error(`${label} must be a whole number from 1 to 2,147,483,647.`);
  return result;
}
