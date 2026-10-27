import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Lookup } from '../../../components/ui/Lookup';
import { getCountries } from '../api';
export function CountrySelect({
  value,
  onChange,
  id = 'country-choice',
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const [search, setSearch] = useState('');
  const q = useInfiniteQuery({
    queryKey: ['countries', 'choices', search.trim()],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getCountries({ search: search.trim(), pageNumber: pageParam, pageSize: 10 }, signal),
    getNextPageParam: (last) => (last.hasNextPage ? last.pageNumber + 1 : undefined),
    staleTime: 300000,
  });
  return (
    <Lookup
      id={id}
      label="Country"
      value={value}
      onChange={onChange}
      search={search}
      onSearch={setSearch}
      options={q.data?.pages.flatMap((p) => p.items) ?? []}
      loading={q.isFetching}
      error={q.error}
      more={q.hasNextPage}
      loadMore={() => {
        void q.fetchNextPage();
      }}
      retry={() => {
        void q.refetch();
      }}
    />
  );
}
