import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { useCrmContext } from '../context/CrmContext';
import type { ContactRegion } from '../types';

const PAGE_SIZE = 10;

export function ContactsPage() {
  const navigate = useNavigate();
  const { searchContacts, upsertContact, state } = useCrmContext();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    notes: '',
    region: 'CA' as ContactRegion,
  });

  const results = useMemo(() => searchContacts(q), [searchContacts, q]);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, page]);

  const rangeStart = results.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, results.length);

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Contacts</h2>
          <p className="muted" style={{ margin: 0 }}>
            {state.contacts.length === 0
              ? 'No contacts yet. Add your first real contact'
              : `${state.contacts.length} contact${state.contacts.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          Add contact
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search name, company, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search contacts"
        />
      </div>

      <div className="panel contacts-panel">
        {results.length === 0 ? (
          <div className="empty">
            <strong>{q.trim() ? 'No matches' : 'No contacts yet'}</strong>
            {q.trim()
              ? 'Try a different name, company, email, or phone.'
              : 'Add real contacts as you go. Nothing is bulk-seeded.'}
          </div>
        ) : (
          <>
            <div className="contacts-table-wrap">
              <table className="contacts-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Company</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Email</th>
                    <th scope="col">Region</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => (
                    <tr
                      key={c.id}
                      className="contacts-row"
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${c.name}`}
                      onClick={() => navigate(`/contacts/${c.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/contacts/${c.id}`);
                        }
                      }}
                    >
                      <td className="contacts-name">{c.name}</td>
                      <td>{c.company || '-'}</td>
                      <td className="mono">{c.phone || '-'}</td>
                      <td className="mono">{c.email || '-'}</td>
                      <td>
                        <span
                          className="chip flag-chip"
                          title={c.region === 'US' ? 'United States' : 'Canada'}
                        >
                          {c.region === 'US' ? '🇺🇸' : '🇨🇦'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="contacts-pagination" aria-label="Contacts pagination">
              <p className="contacts-page-meta muted">
                Showing {rangeStart}-{rangeEnd} of {results.length}
              </p>
              <div className="actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="contacts-page-indicator">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New contact">
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            upsertContact(form);
            setForm({
              name: '',
              company: '',
              phone: '',
              email: '',
              notes: '',
              region: 'CA',
            });
            setShowForm(false);
          }}
        >
          <div className="form-grid two">
            <label className="field">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="field">
              Company
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </label>
          </div>
          <div className="form-grid two">
            <label className="field">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label className="field">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            Customer location
            <select
              value={form.region}
              onChange={(e) =>
                setForm({ ...form, region: e.target.value as ContactRegion })
              }
            >
              <option value="CA">🇨🇦 Canada</option>
              <option value="US">🇺🇸 United States</option>
            </select>
          </label>
          <label className="field">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Save
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
