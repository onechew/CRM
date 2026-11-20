import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DraftActions } from '../components/DraftActions';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { useCrmContext } from '../context/CrmContext';
import type { ContactRegion } from '../types';
import {
  fillTemplate,
  formatWhen,
  fromLocalInputValue,
  toLocalInputValue,
} from '../utils/drafts';
import { v4 as uuid } from 'uuid';

export function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getContact,
    upsertContact,
    deleteContact,
    logsFor,
    addLog,
    scheduledFor,
    cancelScheduled,
    upsertScheduled,
    markReplyReceived,
    state,
  } = useCrmContext();

  const contact = id ? getContact(id) : undefined;
  const logs = id ? logsFor(id) : [];
  const scheduled = id ? scheduledFor(id) : [];
  const owner = state.owner;

  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [logBody, setLogBody] = useState('');
  const [logChannel, setLogChannel] = useState<'note' | 'email' | 'sms' | 'call'>('note');
  const [editForm, setEditForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    notes: '',
    region: 'CA' as ContactRegion,
  });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [schForm, setSchForm] = useState({
    channel: 'email' as 'email' | 'sms' | 'call',
    subject: '',
    body: '',
    dueAt: toLocalInputValue(new Date(Date.now() + 3600000).toISOString()),
    asSequence: false,
  });

  const activeScheduled = useMemo(
    () => scheduled.filter((s) => s.status === 'pending' || s.status === 'due'),
    [scheduled],
  );

  if (!contact) {
    return (
      <div className="panel panel-pad">
        <p>Contact not found.</p>
        <Link to="/contacts">Back to contacts</Link>
      </div>
    );
  }

  const startEdit = () => {
    setEditForm({
      name: contact.name,
      company: contact.company,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes,
      region: contact.region === 'US' ? 'US' : 'CA',
    });
    setEditing(true);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = state.templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setSchForm((f) => ({
      ...f,
      channel: tpl.channel,
      subject: fillTemplate(tpl.subject ?? '', contact),
      body: fillTemplate(tpl.body, contact),
    }));
  };

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        <Link to="/contacts">Contacts</Link> / {contact.name}
      </p>

      <div className="section-head">
        <div>
          <h2>{contact.name}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {contact.company || 'No company'} ·{' '}
            <span
              className="chip"
              title={contact.region === 'US' ? 'United States' : 'Canada'}
            >
              {contact.region === 'US' ? '🇺🇸' : '🇨🇦'}
            </span>
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={startEdit}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingItemId(null);
              setSchForm({
                channel: 'email',
                subject: '',
                body: '',
                dueAt: toLocalInputValue(new Date(Date.now() + 3600000).toISOString()),
                asSequence: false,
              });
              setScheduleOpen(true);
            }}
          >
            Schedule
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              markReplyReceived(contact.id);
              setToast('Reply logged. Remaining sequence stopped');
            }}
          >
            Mark reply received
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack">
          <div className="panel panel-pad">
            <h3 style={{ fontSize: '1.05rem', marginBottom: '0.65rem' }}>Details</h3>
            <p className="meta" style={{ margin: '0 0 0.35rem' }}>
              <span className="mono">{contact.email || '-'}</span>
            </p>
            <p className="meta" style={{ margin: '0 0 0.65rem' }}>
              <span className="mono">{contact.phone || '-'}</span>
            </p>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {contact.notes || 'No notes yet.'}
            </p>
            <div className="actions" style={{ marginTop: '0.85rem' }}>
              {contact.email ? (
                <DraftActions
                  contact={contact}
                  owner={owner}
                  channel="email"
                  subject={`Following up: ${contact.company || contact.name}`}
                  body={`Hi ${contact.name.split(' ')[0]},\n\n`}
                />
              ) : null}
              {contact.phone ? (
                <DraftActions contact={contact} owner={owner} channel="sms" body="" />
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-pad" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: '1.05rem' }}>Communication history</h3>
            </div>
            <form
              className="panel-pad"
              style={{ borderBottom: '1px solid var(--line)' }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!logBody.trim()) return;
                addLog({
                  contactId: contact.id,
                  channel: logChannel,
                  direction: logChannel === 'note' ? 'internal' : 'outbound',
                  body: logBody.trim(),
                });
                setLogBody('');
                setToast('Logged');
              }}
            >
              <div className="form-grid two">
                <label className="field">
                  Type
                  <select
                    value={logChannel}
                    onChange={(e) =>
                      setLogChannel(e.target.value as typeof logChannel)
                    }
                  >
                    <option value="note">Note</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="call">Call</option>
                  </select>
                </label>
              </div>
              <label className="field" style={{ marginTop: '0.65rem' }}>
                Entry
                <textarea
                  value={logBody}
                  onChange={(e) => setLogBody(e.target.value)}
                  placeholder="What happened?"
                  required
                />
              </label>
              <button type="submit" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
                Add log
              </button>
            </form>
            {logs.length === 0 ? (
              <div className="empty">No history yet. Add a manual log entry.</div>
            ) : (
              <ul className="list">
                {logs.map((l) => (
                  <li key={l.id} className="list-row">
                    <div>
                      <div className="actions">
                        <span className={`chip ${l.channel}`}>{l.channel}</span>
                        <span className="chip">{l.direction}</span>
                      </div>
                      {l.subject ? <div className="meta">{l.subject}</div> : null}
                      <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>{l.body}</p>
                      <div className="meta">{formatWhen(l.createdAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-pad" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '1.05rem' }}>Scheduled</h3>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              Edit or cancel anytime. Reply received stops the rest of a sequence.
            </p>
          </div>
          {scheduled.length === 0 ? (
            <div className="empty">Nothing scheduled.</div>
          ) : (
            <ul className="list">
              {scheduled.map((s) => (
                <li key={s.id} className="list-row">
                  <div className="stack">
                    <div className="actions">
                      <span className={`chip ${s.channel}`}>{s.channel}</span>
                      <span
                        className={`chip ${
                          s.status === 'stopped' || s.status === 'cancelled'
                            ? 'danger'
                            : s.status === 'completed'
                              ? 'ok'
                              : ''
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="meta">{formatWhen(s.dueAt)}</div>
                    {s.subject ? <div className="meta">{s.subject}</div> : null}
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{s.body}</p>
                    {(s.status === 'pending' || s.status === 'due') && (
                      <DraftActions
                        contact={contact}
                        owner={owner}
                        channel={s.channel}
                        subject={s.subject}
                        body={s.body}
                      />
                    )}
                  </div>
                  {(s.status === 'pending' || s.status === 'due') && (
                    <div className="actions" style={{ flexDirection: 'column' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditingItemId(s.id);
                          setSchForm({
                            channel: s.channel,
                            subject: s.subject ?? '',
                            body: s.body,
                            dueAt: toLocalInputValue(s.dueAt),
                            asSequence: false,
                          });
                          setScheduleOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => cancelScheduled(s.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {activeScheduled.length > 0 ? (
            <div className="panel-pad">
              <p className="casl-note">
                {activeScheduled.length} active follow-up
                {activeScheduled.length === 1 ? '' : 's'} remaining.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="actions" style={{ marginTop: '1.25rem' }}>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => {
            if (window.confirm(`Delete ${contact.name}?`)) {
              deleteContact(contact.id);
              navigate('/contacts');
            }
          }}
        >
          Delete contact
        </button>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit contact">
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                upsertContact({ id: contact.id, ...editForm });
                setEditing(false);
                setToast('Contact updated');
              }}
            >
              <div className="form-grid two">
                <label className="field">
                  Name
                  <input
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </label>
                <label className="field">
                  Company
                  <input
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  />
                </label>
              </div>
              <div className="form-grid two">
                <label className="field">
                  Phone
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </label>
                <label className="field">
                  Email
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </label>
              </div>
              <label className="field">
                Customer location
                <select
                  value={editForm.region}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      region: e.target.value as ContactRegion,
                    })
                  }
                >
                  <option value="CA">🇨🇦 Canada</option>
                  <option value="US">🇺🇸 United States</option>
                </select>
              </label>
              <label className="field">
                Notes
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </label>
              <div className="actions">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
      </Modal>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title={editingItemId ? 'Edit scheduled item' : 'Schedule follow-up'}
      >
            {!editingItemId ? (
              <label className="field" style={{ marginBottom: '0.75rem' }}>
                Start from template
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) applyTemplate(e.target.value);
                  }}
                >
                  <option value="">- optional -</option>
                  {state.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.channel})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const due = fromLocalInputValue(schForm.dueAt);
                if (editingItemId) {
                  upsertScheduled({
                    id: editingItemId,
                    contactId: contact.id,
                    channel: schForm.channel,
                    sequenceId: scheduled.find((s) => s.id === editingItemId)
                      ?.sequenceId,
                    subject: schForm.channel === 'email' ? schForm.subject : undefined,
                    body: schForm.body,
                    dueAt: due,
                    status: 'pending',
                  });
                } else if (schForm.asSequence && schForm.channel === 'email') {
                  const seq = uuid();
                  const base = new Date(due).getTime();
                  const day = 24 * 60 * 60 * 1000;
                  const smsBody = fillTemplate(
                    state.templates.find((t) => t.channel === 'sms')?.body ??
                      `Hi [First name], Josh at Future Buildings checking in about [Company].`,
                    contact,
                  );
                  upsertScheduled({
                    contactId: contact.id,
                    channel: 'email',
                    sequenceId: seq,
                    subject: schForm.subject,
                    body: schForm.body,
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
                    body: `Call ${contact.name}${contact.company ? ` (${contact.company})` : ''} - follow-up after email/SMS.`,
                    dueAt: new Date(base + 4 * day).toISOString(),
                    status: 'pending',
                  });
                } else {
                  upsertScheduled({
                    contactId: contact.id,
                    channel: schForm.channel,
                    subject: schForm.channel === 'email' ? schForm.subject : undefined,
                    body: schForm.body,
                    dueAt: due,
                    status: 'pending',
                  });
                }
                setScheduleOpen(false);
                setToast(editingItemId ? 'Schedule updated' : 'Follow-up scheduled');
              }}
            >
              <label className="field">
                Type
                <select
                  value={schForm.channel}
                  onChange={(e) =>
                    setSchForm({
                      ...schForm,
                      channel: e.target.value as typeof schForm.channel,
                    })
                  }
                >
                  <option value="email">Email draft</option>
                  <option value="sms">SMS draft</option>
                  <option value="call">Call reminder</option>
                </select>
              </label>
              {schForm.channel === 'email' ? (
                <label className="field">
                  Subject
                  <input
                    value={schForm.subject}
                    onChange={(e) => setSchForm({ ...schForm, subject: e.target.value })}
                  />
                </label>
              ) : null}
              <label className="field">
                {schForm.channel === 'call' ? 'Reminder note' : 'Draft body'}
                <textarea
                  required
                  value={schForm.body}
                  onChange={(e) => setSchForm({ ...schForm, body: e.target.value })}
                />
              </label>
              <label className="field">
                Due / send time
                <input
                  type="datetime-local"
                  required
                  value={schForm.dueAt}
                  onChange={(e) => setSchForm({ ...schForm, dueAt: e.target.value })}
                />
              </label>
              {!editingItemId && schForm.channel === 'email' ? (
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={schForm.asSequence}
                    onChange={(e) =>
                      setSchForm({ ...schForm, asSequence: e.target.checked })
                    }
                  />
                  <span>
                    Also queue SMS (+2 days) and call reminder (+4 days) as one sequence
                  </span>
                </label>
              ) : null}
              <div className="actions">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setScheduleOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
