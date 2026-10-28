import React from 'react';

const links = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'bi-grid-1x2-fill',
  },
  {
    id: 'consumers',
    label: 'Consumers',
    icon: 'bi-people-fill',
  },
  {
    id: 'bills',
    label: 'Electricity Bills',
    icon: 'bi-receipt',
  },
  {
    id: 'pending',
    label: 'Pending Bills',
    icon: 'bi-hourglass-split',
  },
];

export default function Sidebar({ page, setPage, open, close }) {
  return (
    <>
      {open && (
        <div
          className="sidebar-backdrop d-lg-none"
          onClick={close}
        />
      )}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-icon">
            <i className="bi bi-lightning-charge-fill" />
          </span>

          <div>
            <strong>PowerDesk</strong>
            <small>Electricity Billing</small>
          </div>
        </div>

        <div className="sidebar-label">
          WORKSPACE
        </div>

        <nav className="nav flex-column gap-1">
          {links.map(link => (
            <button
              key={link.id}
              className={`nav-link side-link ${
                page === link.id ? 'active' : ''
              }`}
              onClick={() => {
                setPage(link.id);
                close();
              }}
            >
              <i className={`bi ${link.icon}`} />

              <span>{link.label}</span>

              {link.id === 'pending' && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
