import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Lookup } from '../../../components/ui/Lookup';
import { getVenues } from '../api';
export function VenueSelect({
  value,
  onChange,
  countryId,
  id = 'venue-choice',
}: {
  value: string;
  onChange: (value: string) => void;
  countryId?: number | undefined;
  id?: string;
}) {
  const [search, setSearch] = useState('');
  const q = useInfiniteQuery({
    queryKey: ['venues', 'choices', countryId ?? null, search.trim()],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getVenues({ search: search.trim(), countryId, pageNumber: pageParam, pageSize: 10 }, signal),
    getNextPageParam: (last) => (last.hasNextPage ? last.pageNumber + 1 : undefined),
    staleTime: 300000,
  });
  return (
    <Lookup
      id={id}
      label="Venue"
      value={value}
      onChange={onChange}
      search={search}
      onSearch={setSearch}
      options={
        q.data?.pages.flatMap((p) =>
          p.items.map((v) => ({ id: v.id, name: `${v.name} · ${v.city}` })),
        ) ?? []
      }
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
