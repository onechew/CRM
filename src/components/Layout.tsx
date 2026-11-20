import { NavLink, Outlet } from 'react-router-dom';
import { useCrmContext } from '../context/CrmContext';

export function Layout() {
  const { unreadNotifications, todayItems } = useCrmContext();
  const todayCount = todayItems.length;
  const notifyCount = unreadNotifications.length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">Future Buildings</div>
          <div className="brand-sub">Josh Schwartz · CRM</div>
        </div>
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
