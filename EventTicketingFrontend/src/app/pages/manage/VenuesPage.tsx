import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useVenues, VenueCreateForm, useDeleteVenue } from '../../../features/venues/public';
import { CountrySelect } from '../../../features/countries/public';
import { paging, textFilter } from '../../../lib/api/query-params';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { DeleteDialog } from '../../../components/ui/DeleteDialog';
import { Pagination } from '../../../components/ui/Pagination';
import { Empty, Loading, ErrorPanel, QueryFeedback } from '../../../components/ui/Feedback';
export default function ManageVenuesPage() {
  const [params, setParams] = useSearchParams();
  const q = useVenues({ ...paging(params), search: textFilter(params.get('search')) });
  const remove = useDeleteVenue();
  const [saved, setSaved] = useState(false);
  return (
    <div className="container">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1 tabIndex={-1}>Manage venues</h1>
      <p>
        Venue editing awaits capacity in the read contract. Creation and deletion are available.
      </p>
      {saved && <p role="status">Venue created.</p>}
      <details className="panel">
        <summary>Create a venue</summary>
        <VenueCreateForm
          countryChoice={(value, onChange) => (
            <CountrySelect value={value} onChange={onChange} id="venue-form-country" />
          )}
          onSaved={() => setSaved(true)}
        />
      </details>
      <form
        className="search-line"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ search: String(new FormData(e.currentTarget).get('search') ?? '') });
        }}
      >
        <Field
          key={params.toString()}
          id="manage-venue-search"
          name="search"
          label="Search venues"
          maxLength={200}
          defaultValue={params.get('search') ?? ''}
        />
        <Button type="submit">Search</Button>
      </form>
      {q.data ? (
        <>
          <QueryFeedback query={q} />
          {q.data.items.map((v) => (
            <article className="panel management-row" key={v.id}>
              <div>
                <h2>{v.name}</h2>
                <p>{v.city}</p>
                <p className="muted">{v.address || 'No street address'}</p>
              </div>
              <DeleteDialog
                name={v.name}
                description="Deletion is permanent. The server prevents deleting a venue that has events."
                onDelete={async () => {
                  await remove.mutateAsync(v.id);
                }}
              />
            </article>
          ))}
          {!q.data.items.length && <Empty>No venues on this page.</Empty>}
          <Pagination
            page={q.data}
            onPage={(p) => {
              const next = new URLSearchParams(params);
              next.set('pageNumber', String(p));
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
