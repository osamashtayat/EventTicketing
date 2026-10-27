import { queryOptions, useQuery } from '@tanstack/react-query';
import { keys } from '../../lib/query/keys';
import type { Params } from '../../lib/api/types';
import { getCountries, getCountry } from './api';
export const countriesOptions = (q: Params) =>
  queryOptions({
    queryKey: keys.countries.list(q),
    queryFn: ({ signal }) => getCountries(q, signal),
    staleTime: 300000,
  });
export const useCountries = (q: Params) => useQuery(countriesOptions(q));

export const useCountry = (id: number) =>
  useQuery({
    queryKey: keys.countries.detail(id),
    queryFn: ({ signal }) => getCountry(id, signal),
    enabled: id > 0,
    staleTime: 300000,
  });
