import type { ReactNode } from 'react';
import { ApiError, errorMessage } from '../../lib/api/errors';
import { Button } from './Button';
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert" role="alert">
      {children}
    </div>
  );
}
export function ErrorPanel({ error, retry }: { error: unknown; retry?: (() => void) | undefined }) {
  return (
    <Alert>
      <p>{errorMessage(error)}</p>
      {error instanceof ApiError &&
        Object.entries(error.fields).map(([key, values]) => (
          <p key={key}>
            {key}: {values.join(' ')}
          </p>
        ))}
      {error instanceof ApiError &&
        error.issues.slice(1).map((issue) => <p key={issue.code}>{issue.description}</p>)}
      {error instanceof ApiError && error.traceId && <small>Reference: {error.traceId}</small>}
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </Alert>
  );
}
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="loading-dot" />
      {label}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function QueryFeedback({
  query,
}: {
  query: { isFetching: boolean; isError: boolean; error: unknown; refetch: () => unknown };
}) {
  return (
    <>
      {query.isFetching && (
        <p role="status" className="muted">
          Refreshing…
        </p>
      )}
      {query.isError && (
        <ErrorPanel
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      )}
    </>
  );
}
