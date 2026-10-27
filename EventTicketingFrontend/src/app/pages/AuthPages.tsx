import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { SignInForm, RegisterForm, useMe } from '../../features/auth/public';
import { logout, signIn, refreshSession } from '../session';
import { Button } from '../../components/ui/Button';
import { ErrorPanel } from '../../components/ui/Feedback';
export function safeReturn(value: string | null): string {
  if (
    !value ||
    value.startsWith('//') ||
    value.includes('\\') ||
    !/^\/(?:events(?:\/[1-9]\d*)?|venues(?:\/[1-9]\d*)?|countries(?:\/[1-9]\d*)?|bookings(?:\/[1-9]\d*)?|account|manage\/(?:events(?:\/(?:new|[1-9]\d*))?|countries|venues|accounts\/new))(?:\?[^#]*)?$/.test(
      value,
    )
  )
    return '/events';
  return value;
}
export function SignInPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  return (
    <div className="reading">
      <p className="eyebrow">WELCOME BACK</p>
      <h1 tabIndex={-1}>Good to see you.</h1>
      {params.get('registered') === '1' && (
        <p role="status">Your account is ready. Sign in to continue.</p>
      )}
      <div className="panel">
        <SignInForm
          onSignIn={signIn}
          onSuccess={() => navigate(safeReturn(params.get('returnTo')), { replace: true })}
        />
      </div>
    </div>
  );
}
export function RegisterPage() {
  const navigate = useNavigate();
  return (
    <div className="reading">
      <p className="eyebrow">COME BE PART OF IT</p>
      <h1 tabIndex={-1}>Your next chapter.</h1>
      <div className="panel">
        <RegisterForm onSuccess={() => navigate('/sign-in?registered=1', { replace: true })} />
      </div>
      <Link className="text-link" to="/sign-in">
        Already have an account? Sign in
      </Link>
    </div>
  );
}
export function AccountPage() {
  const me = useMe();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>();
  return (
    <div className="reading">
      <h1 tabIndex={-1}>Your account</h1>
      <div className="panel">
        <dl className="metadata">
          <dt>Name</dt>
          <dd>
            {[me.data?.firstName, me.data?.lastName].filter(Boolean).join(' ') ||
              'Name not provided'}
          </dd>
          <dt>Email</dt>
          <dd>{me.data?.email || 'Not provided'}</dd>
          <dt>Roles</dt>
          <dd>{me.data?.roles.join(', ') || 'No assigned role'}</dd>
        </dl>
        <div className="actions">
          <Button
            variant="secondary"
            onClick={async () => {
              setError(undefined);
              try {
                await refreshSession(true);
                await me.refetch();
              } catch (e) {
                setError(e);
              }
            }}
          >
            Refresh session
          </Button>
          <Button
            onClick={() => {
              logout();
              navigate('/events');
            }}
          >
            Sign out
          </Button>
        </div>
        {error != null && <ErrorPanel error={error} />}
        <p className="muted text-sm">
          Signing out ends this browser session. Already issued server tokens are not revoked.
        </p>
      </div>
    </div>
  );
}
