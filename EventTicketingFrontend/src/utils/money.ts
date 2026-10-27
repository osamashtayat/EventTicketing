import { money } from '../lib/api/json-codec';
import type { MoneyAmount } from '../lib/api/types';
export function cents(value: MoneyAmount): bigint {
  return BigInt(value.replace('.', ''));
}
export function fromCents(value: bigint): MoneyAmount {
  if (value < 0n) throw new Error('Amount cannot be negative.');
  return money(`${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`);
}
export function estimate(items: { price: MoneyAmount; quantity: number }[]): MoneyAmount {
  return fromCents(
    items.reduce((sum, item) => sum + cents(item.price) * BigInt(item.quantity), 0n),
  );
}
export function formatMoney(value: MoneyAmount, locale = 'en-US'): string {
  const amount = cents(value);
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).formatToParts(
    amount / 100n,
  );
  return parts
    .map((part) =>
      part.type === 'fraction' ? (amount % 100n).toString().padStart(2, '0') : part.value,
    )
    .join('');
}
