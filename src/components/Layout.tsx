import { Link, NavLink, Outlet } from 'react-router-dom';
import { useCrmContext } from '../context/CrmContext';

export function Layout() {
  const { state, unreadNotifications, todayItems } = useCrmContext();
  const todayCount = todayItems.length;
  const notifyCount = unreadNotifications.length;
  const owner = state.owner;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Future Buildings — Today">
          <div className="brand-mark">Future Buildings</div>
          <div className="brand-sub">
            {owner.name} · {owner.company}
          </div>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Today
            {todayCount > 0 || notifyCount > 0 ? (
              <span className="badge">{todayCount + notifyCount}</span>
            ) : null}
          </NavLink>
          <NavLink
            to="/contacts"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Contacts
          </NavLink>
          <NavLink
            to="/templates"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Templates
          </NavLink>
          <NavLink
            to="/schedule"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Schedule
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Profile
          </NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
