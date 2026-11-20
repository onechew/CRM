import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { useCrmContext } from '../context/CrmContext';
import type { ContactRegion } from '../types';

export function ContactsPage() {
  const { searchContacts, upsertContact, state } = useCrmContext();
  const [q, setQ] = useState('');
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

      <div className="panel">
        {results.length === 0 ? (
          <div className="empty">
            <strong>{q.trim() ? 'No matches' : 'No contacts yet'}</strong>
            {q.trim()
              ? 'Try a different name, company, email, or phone.'
              : 'Add real contacts as you go. Nothing is bulk-seeded.'}
          </div>
        ) : (
          <ul className="list">
            {results.map((c) => (
              <li key={c.id} className="list-row">
                <div>
                  <Link className="title" to={`/contacts/${c.id}`}>
                    {c.name}
                  </Link>
                  <div className="meta">
                    {c.company || '-'}
                    {c.email ? ` · ${c.email}` : ''}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </div>
                </div>
                <div className="actions">
                  <span className="chip" title={c.region === 'US' ? 'United States' : 'Canada'}>
                    {c.region === 'US' ? '🇺🇸' : '🇨🇦'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
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
