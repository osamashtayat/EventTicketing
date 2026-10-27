import { Link } from 'react-router';
export function RouteError() {
  return (
    <div className="container">
      <h1 tabIndex={-1}>This link is unavailable</h1>
      <p>Use a valid positive resource ID, or start again from the directory.</p>
      <Link className="text-link" to="/events">
        Explore events →
      </Link>
    </div>
  );
}
