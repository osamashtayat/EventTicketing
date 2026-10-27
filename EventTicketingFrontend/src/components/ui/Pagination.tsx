import type { Page } from '../../lib/api/types';
import { Button } from './Button';
export function Pagination({
  page,
  onPage,
}: {
  page: Omit<Page<unknown>, 'items'>;
  onPage: (page: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="pagination">
      <p>
        {page.totalCount} {page.totalCount === 1 ? 'result' : 'results'}
        {page.totalPages > 0 ? ` · Page ${page.pageNumber} of ${page.totalPages}` : ''}
      </p>
      <div className="actions">
        {page.pageNumber > page.totalPages && page.pageNumber > 1 && (
          <Button variant="secondary" onClick={() => onPage(1)}>
            First page
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={!page.hasPreviousPage}
          onClick={() => onPage(page.pageNumber - 1)}
        >
          ← Previous
        </Button>
        <Button
          variant="secondary"
          disabled={!page.hasNextPage}
          onClick={() => onPage(page.pageNumber + 1)}
        >
          Next →
        </Button>
      </div>
    </nav>
  );
}
