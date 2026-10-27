declare const moneyBrand: unique symbol;
/** Validated, canonical exact USD decimal; never a wire JSON string. */
export type MoneyAmount = string & { readonly [moneyBrand]: true };
export type Params = Readonly<Record<string, string | number | boolean | undefined>>;
export interface Page<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
