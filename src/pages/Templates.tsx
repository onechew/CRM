import { useState } from 'react';
import { Toast } from '../components/Toast';
import { useCrmContext } from '../context/CrmContext';

export function TemplatesPage() {
  const { state, upsertTemplate, deleteTemplate } = useCrmContext();
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    channel: 'email' as 'email' | 'sms',
    subject: '',
    body: '',
  });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', channel: 'email', subject: '', body: '' });
    setOpen(true);
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Templates</h2>
          <p className="muted" style={{ margin: 0 }}>
            Save and reuse email & SMS drafts. Placeholders: {'{{name}}'}, {'{{company}}'}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          New template
        </button>
      </div>

      <div className="panel">
        {state.templates.length === 0 ? (
          <div className="empty">No templates yet.</div>
        ) : (
          <ul className="list">
            {state.templates.map((t) => (
              <li key={t.id} className="list-row">
                <div>
                  <div className="actions">
                    <span className={`chip ${t.channel}`}>{t.channel}</span>
                  </div>
                  <div className="title" style={{ marginTop: '0.35rem' }}>
                    {t.name}
                  </div>
                  {t.subject ? <div className="meta">{t.subject}</div> : null}
                  <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{t.body}</p>
                </div>
                <div className="actions" style={{ flexDirection: 'column' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingId(t.id);
                      setForm({
                        name: t.name,
                        channel: t.channel,
                        subject: t.subject ?? '',
                        body: t.body,
                      });
                      setOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      deleteTemplate(t.id);
                      setToast('Template deleted');
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open ? (
        <div className="drawer-overlay" role="dialog" aria-modal="true">
          <div className="drawer">
            <h3>{editingId ? 'Edit template' : 'New template'}</h3>
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                upsertTemplate({
                  id: editingId ?? undefined,
                  name: form.name,
                  channel: form.channel,
                  subject: form.channel === 'email' ? form.subject : undefined,
                  body: form.body,
                });
                setOpen(false);
                setToast('Template saved');
              }}
            >
              <label className="field">
                Name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="field">
                Channel
                <select
                  value={form.channel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      channel: e.target.value as 'email' | 'sms',
                    })
                  }
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </label>
              {form.channel === 'email' ? (
                <label className="field">
                  Subject
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </label>
              ) : null}
              <label className="field">
                Body
                <textarea
                  required
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </label>
              {form.channel === 'sms' ? (
                <p className="casl-note">
                  Include STOP language for commercial SMS when you send for real later.
                </p>
              ) : null}
              <div className="actions">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
