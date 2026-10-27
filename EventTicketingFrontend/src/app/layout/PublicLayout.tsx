import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useDisplayPreferences } from '../../stores/display-preferences';
import { useMe, useSession } from '../../features/auth/public';
import { Button } from '../../components/ui/Button';
export function PublicLayout() {
  const me = useMe();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const mode = useDisplayPreferences((s) => s.timeDisplay);
  const setMode = useDisplayPreferences((s) => s.setTimeDisplay);
  useEffect(() => {
    const main = document.getElementById('main');
    const focusHeading = () => {
      const heading = main?.querySelector<HTMLElement>('h1');
      if (!heading) return false;
      heading.focus();
      return true;
    };
    if (focusHeading()) return;
    main?.focus();
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    if (main) observer.observe(main, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/events" className="brand">
            <span className="brand-mark" aria-hidden="true">
              ↗
            </span>
            <span className="wordmark">
              Encore<span className="brand-period">.</span>
            </span>
          </Link>
          <Button
            ref={menu}
            className="menu-toggle"
            variant="secondary"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </Button>
          <nav
            id="site-nav"
            className={open ? 'site-nav open' : 'site-nav'}
            aria-label="Main"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                menu.current?.focus();
              }
            }}
            onClick={(e) => {
              if (e.target instanceof Element && e.target.closest('a')) setOpen(false);
            }}
          >
            <NavLink to="/events">Events</NavLink>
            <NavLink to="/venues">Venues</NavLink>
            <NavLink to="/countries">Countries</NavLink>
            {session.active ? (
              <>
                <NavLink to="/bookings">My bookings</NavLink>
                <NavLink to="/account">Account</NavLink>
                {!me.isError &&
                  me.data?.roles.some((r) => r === 'Admin' || r === 'EventOrganizer') && (
                    <NavLink to="/manage/events">Manage</NavLink>
                  )}
              </>
            ) : (
              <NavLink to="/sign-in">
                Sign in <span aria-hidden="true">↗</span>
              </NavLink>
            )}
          </nav>
          <label className="time-control">
            Times in
            <select
              aria-label="Display times in"
              value={mode}
              onChange={(e) => setMode(e.target.value === 'UTC' ? 'UTC' : 'local')}
            >
              <option value="local">Local time</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer container">
        <div>
          <span className="eyebrow">ENCORE</span>
          <p>Less scrolling. More showing up.</p>
        </div>
        <p className="muted">
          Real experiences. Simple bookings.
          <br />
          All ticket prices in USD.
        </p>
      </footer>
    </>
  );
}
