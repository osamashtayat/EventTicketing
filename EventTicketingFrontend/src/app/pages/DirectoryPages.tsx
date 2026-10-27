import { Link, useParams, useSearchParams } from 'react-router';
import { useCountries, useCountry } from '../../features/countries/public';
import { useVenues, useVenue } from '../../features/venues/public';
import { paging, positiveId, textFilter } from '../../lib/api/query-params';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Empty, ErrorPanel, Loading, QueryFeedback } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import { EventList } from './EventList';
import { RouteError } from './RouteError';
function DirectorySearch({
  search,
  onSearch,
}: {
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <form
      className="search-line panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(String(new FormData(e.currentTarget).get('search') ?? ''));
      }}
    >
      <Field
        id="directory-search"
        name="search"
        label="Search directory"
        maxLength={200}
        defaultValue={search}
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
export function CountriesPage() {
  const [params, setParams] = useSearchParams();
  const q = useCountries({ ...paging(params), search: textFilter(params.get('search')) });
  return (
    <div className="container">
      <p className="eyebrow">A WORLD OF POSSIBILITIES</p>
      <h1 tabIndex={-1}>Explore countries</h1>
      <DirectorySearch
        key={params.toString()}
        search={params.get('search') ?? ''}
        onSearch={(search) => setParams(search ? { search } : {})}
      />
      {q.data ? (
        <>
          <QueryFeedback query={q} />
          <div className="directory-grid">
            {q.data.items.map((c) => (
              <Link className="panel directory-card" to={`/countries/${c.id}`} key={c.id}>
                <span className="eyebrow">{c.shortName}</span>
                <h2>
                  {c.name} <span aria-hidden="true">↗</span>
                </h2>
              </Link>
            ))}
          </div>
          {q.data.items.length === 0 && (
            <Empty>
              {q.data.totalCount > 0 ? 'No countries on this page.' : 'No matching countries.'}
            </Empty>
          )}
          <Pagination
            page={q.data}
            onPage={(page) => {
              const next = new URLSearchParams(params);
              next.set('pageNumber', String(page));
              setParams(next);
            }}
          />
        </>
      ) : q.isError ? (
        <ErrorPanel
          error={q.error}
          retry={() => {
            void q.refetch();
          }}
        />
      ) : (
        <Loading />
      )}
    </div>
  );
}
export function VenuesPage() {
  const [params, setParams] = useSearchParams();
  return (
    <div className="container">
      <p className="eyebrow">PLACES THAT BRING US TOGETHER</p>
      <h1 tabIndex={-1}>Explore venues</h1>
      <DirectorySearch
        key={params.toString()}
        search={params.get('search') ?? ''}
        onSearch={(search) => setParams(search ? { search } : {})}
      />
      <VenueDirectory
        params={params}
        onPage={(page) => {
          const next = new URLSearchParams(params);
          next.set('pageNumber', String(page));
          setParams(next);
        }}
      />
    </div>
  );
}
function VenueDirectory({
  params,
  onPage,
  countryId,
}: {
  params: URLSearchParams;
  onPage: (page: number) => void;
  countryId?: number;
}) {
  const q = useVenues({ ...paging(params), search: textFilter(params.get('search')), countryId });
  if (!q.data)
    return q.isError ? (
      <ErrorPanel
        error={q.error}
        retry={() => {
          void q.refetch();
        }}
      />
    ) : (
      <Loading />
    );
  return (
    <>
      <QueryFeedback query={q} />
      <div className="directory-grid">
        {q.data.items.map((v) => (
          <Link className="panel directory-card" key={v.id} to={`/venues/${v.id}`}>
            <p className="eyebrow">{v.city}</p>
            <h2>{v.name} ↗</h2>
            <p className="muted">{v.address || 'Address not provided'}</p>
          </Link>
        ))}
      </div>
      {q.data.items.length === 0 && (
        <Empty>{q.data.totalCount > 0 ? 'No venues on this page.' : 'No matching venues.'}</Empty>
      )}
      <Pagination page={q.data} onPage={onPage} />
    </>
  );
}
function CountryDetails({ id }: { id: number }) {
  const q = useCountry(id);
  const [params, setParams] = useSearchParams();
  if (!q.data)
    return (
      <div className="container">
        {q.isError ? (
          <ErrorPanel
            error={q.error}
            retry={() => {
              void q.refetch();
            }}
          />
        ) : (
          <Loading />
        )}
      </div>
    );
  return (
    <div className="container">
      <p className="breadcrumb">
        <Link to="/countries">Countries</Link> / {q.data.shortName}
      </p>
      <h1 tabIndex={-1}>{q.data.name}</h1>
      <QueryFeedback query={q} />
      <h2>Discover its venues</h2>
      <VenueDirectory
        params={params}
        countryId={id}
        onPage={(page) => setParams({ pageNumber: String(page) })}
      />
    </div>
  );
}
export function CountryDetailsPage() {
  const id = positiveId(useParams().countryId);
  return id ? <CountryDetails key={id} id={id} /> : <RouteError />;
}
function VenueDetails({ id }: { id: number }) {
  const venue = useVenue(id);
  const country = useCountry(venue.data?.countryId ?? 0);
  const [params, setParams] = useSearchParams();
  if (!venue.data)
    return (
      <div className="container">
        {venue.isError ? (
          <ErrorPanel
            error={venue.error}
            retry={() => {
              void venue.refetch();
            }}
          />
        ) : (
          <Loading />
        )}
      </div>
    );
  return (
    <div className="container">
      <p className="breadcrumb">
        <Link to="/venues">Venues</Link> / {venue.data.city}
      </p>
      <h1 tabIndex={-1}>{venue.data.name}</h1>
      <QueryFeedback query={venue} />
      <p>
        {venue.data.city}
        {country.data && (
          <>
            {' '}
            ·{' '}
            <Link className="text-link" to={`/countries/${country.data.id}`}>
              {country.data.name}
            </Link>
          </>
        )}
      </p>
      {country.isError && (
        <ErrorPanel
          error={country.error}
          retry={() => {
            void country.refetch();
          }}
        />
      )}
      <p className="muted">{venue.data.address || 'Street address not provided.'}</p>
      <h2>What’s happening here</h2>
      <EventList
        filters={{ ...paging(params), venueId: id }}
        onPage={(page) => setParams({ pageNumber: String(page) })}
      />
    </div>
  );
}
export function VenueDetailsPage() {
  const id = positiveId(useParams().venueId);
  return id ? <VenueDetails key={id} id={id} /> : <RouteError />;
}
