import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useCountries, CountryForm, useDeleteCountry } from '../../../features/countries/public';
import type { CountrySummary } from '../../../features/countries/public';
import { paging, textFilter } from '../../../lib/api/query-params';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { DeleteDialog } from '../../../components/ui/DeleteDialog';
import { Pagination } from '../../../components/ui/Pagination';
import { Empty, Loading, ErrorPanel, QueryFeedback } from '../../../components/ui/Feedback';
export default function ManageCountriesPage() {
  const [params, setParams] = useSearchParams();
  const q = useCountries({ ...paging(params), search: textFilter(params.get('search')) });
  const remove = useDeleteCountry();
  const [editing, setEditing] = useState<CountrySummary>();
  const [saved, setSaved] = useState(false);
  return (
    <div className="container">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1 tabIndex={-1}>Manage countries</h1>
      {saved && <p role="status">Country saved.</p>}
      <div className="panel">
        <h2>Create a country</h2>
        <CountryForm onSaved={() => setSaved(true)} />
      </div>
      <form
        className="search-line"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ search: String(new FormData(e.currentTarget).get('search') ?? '') });
        }}
      >
        <Field
          key={params.toString()}
          id="manage-country-search"
          name="search"
          label="Search countries"
          maxLength={200}
          defaultValue={params.get('search') ?? ''}
        />
        <Button type="submit">Search</Button>
      </form>
      {q.data ? (
        <>
          <QueryFeedback query={q} />
          {q.data.items.map((c) => (
            <article className="panel management-row" key={c.id}>
              <div>
                <h2>{c.name}</h2>
                <p className="muted">{c.shortName}</p>
              </div>
              <div className="actions">
                <Button variant="secondary" onClick={() => setEditing(c)}>
                  Edit {c.name}
                </Button>
                <DeleteDialog
                  name={c.name}
                  description="Deletion is permanent. The server prevents deleting a country with venues."
                  onDelete={async () => {
                    await remove.mutateAsync(c.id);
                  }}
                />
              </div>
            </article>
          ))}
          {!q.data.items.length && <Empty>No countries on this page.</Empty>}
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
      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) setEditing(undefined);
        }}
        title="Edit country"
        description="Save the full country name and short name."
      >
        {editing && (
          <CountryForm
            key={editing.id}
            existing={editing}
            onSaved={() => {
              setEditing(undefined);
              setSaved(true);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
