import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { Toast } from '../components/Toast';
import { useCrmContext } from '../context/CrmContext';
import {
  fillTemplate,
  formatWhen,
  fromLocalInputValue,
  toLocalInputValue,
} from '../utils/drafts';

export function SchedulePage() {
  const {
    state,
    contactsSorted,
    getContact,
    upsertScheduled,
    cancelScheduled,
  } = useCrmContext();
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    contactId: '',
    channel: 'email' as 'email' | 'sms' | 'call',
    subject: '',
    body: '',
    dueAt: toLocalInputValue(new Date(Date.now() + 3600000).toISOString()),
    asSequence: true,
    templateId: '',
  });

  const upcoming = useMemo(
    () =>
      [...state.scheduled]
        .filter((s) => s.status === 'pending' || s.status === 'due')
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [state.scheduled],
  );

  const applyTemplate = (templateId: string, contactId: string) => {
    const tpl = state.templates.find((t) => t.id === templateId);
    const contact = getContact(contactId);
    if (!tpl || !contact) return;
    setForm((f) => ({
      ...f,
      templateId,
      channel: tpl.channel,
      subject: fillTemplate(tpl.subject ?? '', contact),
      body: fillTemplate(tpl.body, contact),
    }));
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Schedule</h2>
          <p className="muted" style={{ margin: 0 }}>
            Queue email drafts, SMS drafts, and call reminders — open or copy when due.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setForm({
              contactId: contactsSorted[0]?.id ?? '',
              channel: 'email',
              subject: '',
              body: '',
              dueAt: toLocalInputValue(new Date(Date.now() + 3600000).toISOString()),
              asSequence: true,
              templateId: '',
            });
            setOpen(true);
          }}
        >
          New follow-up
        </button>
      </div>

      <div className="panel">
        {upcoming.length === 0 ? (
          <div className="empty">No pending scheduled items.</div>
        ) : (
          <ul className="list">
            {upcoming.map((s) => {
              const c = getContact(s.contactId);
              return (
                <li key={s.id} className="list-row">
                  <div>
                    <div className="actions">
                      <span className={`chip ${s.channel}`}>{s.channel}</span>
                      {s.sequenceId ? <span className="chip">Sequence</span> : null}
                    </div>
                    <Link
                      className="title"
                      to={c ? `/contacts/${c.id}` : '/contacts'}
                      style={{ display: 'inline-block', marginTop: '0.35rem' }}
                    >
                      {c?.name ?? 'Unknown'}
                      {c?.company ? ` · ${c.company}` : ''}
                    </Link>
                    <div className="meta">{formatWhen(s.dueAt)}</div>
                    {s.subject ? <div className="meta">{s.subject}</div> : null}
                    <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{s.body}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      cancelScheduled(s.id);
                      setToast('Cancelled');
                    }}
                  >
                    Cancel
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open ? (
        <div className="drawer-overlay" role="dialog" aria-modal="true">
          <div className="drawer">
            <h3>Schedule follow-up</h3>
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const contact = getContact(form.contactId);
                if (!contact) return;
                if (!contact.caslConsent && form.channel !== 'call') {
                  if (
                    !window.confirm(
                      'No CASL consent flagged for this contact. Schedule anyway?',
                    )
                  ) {
                    return;
                  }
                }
                const due = fromLocalInputValue(form.dueAt);
                if (form.asSequence && form.channel === 'email') {
                  const seq = uuid();
                  const base = new Date(due).getTime();
                  const day = 24 * 60 * 60 * 1000;
                  const smsTpl = state.templates.find((t) => t.channel === 'sms');
                  const smsBody = fillTemplate(
                    smsTpl?.body ??
                      `Hi {{name}}, Josh at Future Buildings checking in about {{company}}. Reply STOP to opt out.`,
                    contact,
                  );
                  upsertScheduled({
                    contactId: contact.id,
                    channel: 'email',
                    sequenceId: seq,
                    subject: form.subject,
                    body: form.body,
                    dueAt: due,
                    status: 'pending',
                  });
                  upsertScheduled({
                    contactId: contact.id,
                    channel: 'sms',
                    sequenceId: seq,
                    body: smsBody,
                    dueAt: new Date(base + 2 * day).toISOString(),
                    status: 'pending',
                  });
                  upsertScheduled({
                    contactId: contact.id,
                    channel: 'call',
                    sequenceId: seq,
                    body: `Call ${contact.name}${contact.company ? ` (${contact.company})` : ''} — follow-up after email/SMS.`,
                    dueAt: new Date(base + 4 * day).toISOString(),
                    status: 'pending',
                  });
                } else {
                  upsertScheduled({
                    contactId: contact.id,
                    channel: form.channel,
                    subject: form.channel === 'email' ? form.subject : undefined,
                    body: form.body,
                    dueAt: due,
                    status: 'pending',
                  });
                }
                setOpen(false);
                setToast('Scheduled');
              }}
            >
              <label className="field">
                Contact
                <select
                  required
                  value={form.contactId}
                  onChange={(e) => {
                    const contactId = e.target.value;
                    setForm((f) => ({ ...f, contactId }));
                    if (form.templateId) applyTemplate(form.templateId, contactId);
                  }}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {contactsSorted.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` — ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Template (optional)
                <select
                  value={form.templateId}
                  onChange={(e) => {
                    const templateId = e.target.value;
                    setForm((f) => ({ ...f, templateId }));
                    if (templateId && form.contactId) {
                      applyTemplate(templateId, form.contactId);
                    }
                  }}
                >
                  <option value="">— none —</option>
                  {state.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.channel})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Type
                <select
                  value={form.channel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      channel: e.target.value as typeof form.channel,
                    })
                  }
                >
                  <option value="email">Email draft</option>
                  <option value="sms">SMS draft</option>
                  <option value="call">Call reminder</option>
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
                Draft / note
                <textarea
                  required
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </label>
              <label className="field">
                Due time
                <input
                  type="datetime-local"
                  required
                  value={form.dueAt}
                  onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                />
              </label>
              {form.channel === 'email' ? (
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={form.asSequence}
                    onChange={(e) =>
                      setForm({ ...form, asSequence: e.target.checked })
                    }
                  />
                  <span>
                    Queue sequence: email → SMS (+2 days) → call (+4 days)
                  </span>
                </label>
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
