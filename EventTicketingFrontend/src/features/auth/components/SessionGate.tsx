import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useMe, useSession } from '../queries';
import { ErrorPanel, Loading } from '../../../components/ui/Feedback';
export function SessionGate({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const session = useSession();
  const me = useMe();
  const location = useLocation();
  if (!session.active)
    return (
      <div className="reading">
        <h1 tabIndex={-1}>Sign in to continue</h1>
        <Link
          className="button primary"
          to={`/sign-in?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        >
          Sign in
        </Link>
      </div>
    );
  if (!me.data)
    return (
      <div className="reading">
        {me.isError ? (
          <ErrorPanel
            error={me.error}
            retry={() => {
              void me.refetch();
            }}
          />
        ) : (
          <Loading label="Checking your account…" />
        )}
      </div>
    );
  if (me.isError)
    return (
      <div className="reading">
        <ErrorPanel
          error={me.error}
          retry={() => {
            void me.refetch();
          }}
        />
      </div>
    );
  if (roles && !roles.some((r) => me.data.roles.includes(r)))
    return (
      <div className="reading">
        <h1 tabIndex={-1}>Access unavailable</h1>
        <p>Your account does not have permission to open this page.</p>
      </div>
    );
  return children;
}
