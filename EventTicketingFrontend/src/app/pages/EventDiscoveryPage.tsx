import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { eventFilters } from '../../features/events/public';
import { CountrySelect } from '../../features/countries/public';
import { VenueSelect } from '../../features/venues/public';
import { positiveId, queryString } from '../../lib/api/query-params';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { EventList } from './EventList';
function SearchForm({
  params,
  apply,
}: {
  params: URLSearchParams;
  apply: (params: URLSearchParams) => void;
}) {
  const [country, setCountry] = useState(params.get('countryId') ?? '');
  const [venue, setVenue] = useState(params.get('venueId') ?? '');
  return (
    <form
      className="discovery-search"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const next = new URLSearchParams();
        for (const name of ['search', 'city']) {
          const value = String(data.get(name) ?? '').trim();
          if (value) next.set(name, value);
        }
        if (country) next.set('countryId', country);
        if (venue) next.set('venueId', venue);
        for (const name of ['startFrom', 'startTo']) {
          const value = String(data.get(name) ?? '');
          if (value)
            next.set(
              name,
              new Date(
                `${value}T${name === 'startFrom' ? '00:00:00.000' : '23:59:59.999'}Z`,
              ).toISOString(),
            );
        }
        if (data.get('upcoming') && !next.has('startFrom'))
          next.set('startFrom', new Date().toISOString());
        apply(next);
      }}
    >
      <div className="search-line">
        <Field
          id="event-search"
          name="search"
          label="Find your next experience"
          placeholder="Search events, moments, possibilities…"
          defaultValue={params.get('search') ?? ''}
          maxLength={200}
        />
        <Button type="submit">
          Find events <span aria-hidden="true">↗</span>
        </Button>
      </div>
      <details>
        <summary>
          Refine your search <span aria-hidden="true">＋</span>
        </summary>
        <div className="filter-grid">
          <CountrySelect
            value={country}
            onChange={(value) => {
              setCountry(value);
              setVenue('');
            }}
          />
          <VenueSelect value={venue} onChange={setVenue} countryId={positiveId(country)} />
          <Field
            id="city"
            name="city"
            label="City"
            hint="Exact city name"
            maxLength={200}
            defaultValue={params.get('city') ?? ''}
          />
          <Field
            id="start-from"
            name="startFrom"
            type="date"
            label="Starts on or after (UTC)"
            defaultValue={params.get('startFrom')?.slice(0, 10) ?? ''}
          />
          <Field
            id="start-to"
            name="startTo"
            type="date"
            label="Starts on or before (UTC)"
            defaultValue={params.get('startTo')?.slice(0, 10) ?? ''}
          />
          <label className="check">
            <input name="upcoming" type="checkbox" />
            Upcoming events only
          </label>
        </div>
        <div className="actions">
          <Button type="submit">Apply filters</Button>
          <Button variant="secondary" onClick={() => apply(new URLSearchParams())}>
            Clear filters
          </Button>
        </div>
      </details>
    </form>
  );
}
export function EventDiscoveryPage() {
  const [params, setParams] = useSearchParams();
  const filters = eventFilters(params);
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">GOOD THINGS HAPPEN WHEN YOU SHOW UP</p>
          <h1 tabIndex={-1}>
            Make room for
            <br />
            <em>something memorable.</em>
          </h1>
          <p>
            Discover the events that bring you closer.
            <br />
            Find your place. Be part of the moment.
          </p>
          <span className="hero-orbit" aria-hidden="true" />
        </div>
      </section>
      <div className="container">
        <SearchForm key={params.toString()} params={params} apply={setParams} />
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE NEXT THING ON YOUR CALENDAR</p>
            <h2>Explore events</h2>
          </div>
          <p className="muted">A little curiosity goes a long way.</p>
        </div>
        <EventList
          filters={filters}
          onPage={(page) =>
            setParams(new URLSearchParams(queryString({ ...filters, pageNumber: page })))
          }
        />
      </div>
    </>
  );
}
