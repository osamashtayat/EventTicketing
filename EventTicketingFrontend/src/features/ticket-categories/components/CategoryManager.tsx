import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { DeleteDialog } from '../../../components/ui/DeleteDialog';
import { Pagination } from '../../../components/ui/Pagination';
import { Empty, Loading, ErrorPanel, QueryFeedback } from '../../../components/ui/Feedback';
import { formatMoney } from '../../../utils/money';
import { useCategories } from '../queries';
import { useDeleteCategory } from '../mutations';
import { CategoryForm } from './CategoryForm';
import type { CategoryDto } from '../types';
export function CategoryManager({
  eventId,
  page,
  onPage,
}: {
  eventId: number;
  page: number;
  onPage: (page: number) => void;
}) {
  const q = useCategories({ eventId, pageNumber: page, pageSize: 10 });
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<CategoryDto>();
  const [saved, setSaved] = useState(false);
  return (
    <section className="panel">
      <h2>Ticket categories</h2>
      {saved && <p role="status">Category saved.</p>}
      <details>
        <summary>Create ticket category</summary>
        <CategoryForm eventId={eventId} onSaved={() => setSaved(true)} />
      </details>
      {q.data ? (
        <>
          <QueryFeedback query={q} />
          {q.data.items.map((category) => (
            <article className="ticket-row management-row" key={category.id}>
              <div>
                <h3>{category.name}</h3>
                <p>
                  {formatMoney(category.price)} USD · {category.capacity} allocated
                </p>
                <p className="muted">{category.description || 'No description'}</p>
              </div>
              <div className="actions">
                <Button variant="secondary" onClick={() => setEditing(category)}>
                  Edit {category.name}
                </Button>
                <DeleteDialog
                  name={category.name}
                  description="The server prevents deletion when any booking history exists."
                  onDelete={async () => {
                    await remove.mutateAsync({ id: category.id, eventId });
                  }}
                />
              </div>
            </article>
          ))}
          {!q.data.items.length && <Empty>No categories on this page.</Empty>}
          <Pagination page={q.data} onPage={onPage} />
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
        title="Edit ticket category"
        description="Changes apply to future bookings. Historical prices and names remain unchanged."
      >
        {editing && (
          <CategoryForm
            key={editing.id}
            eventId={eventId}
            existing={editing}
            onSaved={() => {
              setEditing(undefined);
              setSaved(true);
            }}
          />
        )}
      </Dialog>
    </section>
  );
}
