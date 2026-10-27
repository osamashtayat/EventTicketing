import { NavLink, Outlet } from 'react-router';
import { useMe } from '../../features/auth/public';
export function ManagementLayout() {
  const me = useMe();
  return (
    <>
      <div className="management-nav">
        <nav className="container actions" aria-label="Management">
          <NavLink to="/manage/events">Events</NavLink>
          <NavLink to="/manage/events/new">Create event</NavLink>
          {me.data?.roles.includes('Admin') && (
            <>
              <NavLink to="/manage/countries">Countries</NavLink>
              <NavLink to="/manage/venues">Venues</NavLink>
              <NavLink to="/manage/accounts/new">Create account</NavLink>
            </>
          )}
        </nav>
      </div>
      <Outlet />
    </>
  );
}
