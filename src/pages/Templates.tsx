import { useMemo, useRef, useState } from 'react';
import { Toast } from '../components/Toast';
import { useCrmContext } from '../context/CrmContext';
import type { Template } from '../types';
import { TEMPLATE_INSERTS, formatTemplateForDisplay } from '../utils/drafts';

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
  const [insertTarget, setInsertTarget] = useState<'subject' | 'body'>('body');
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const emailTemplates = useMemo(
    () => state.templates.filter((t) => t.channel === 'email'),
    [state.templates],
  );
  const smsTemplates = useMemo(
    () => state.templates.filter((t) => t.channel === 'sms'),
    [state.templates],
  );

  const openNew = (channel: 'email' | 'sms') => {
    setEditingId(null);
    setForm({ name: '', channel, subject: '', body: '' });
    setInsertTarget('body');
    setOpen(true);
  };

  const insertChip = (token: string) => {
    if (insertTarget === 'subject' && form.channel === 'email') {
      const el = subjectRef.current;
      const start = el?.selectionStart ?? form.subject.length;
      const end = el?.selectionEnd ?? start;
      const next = form.subject.slice(0, start) + token + form.subject.slice(end);
      setForm({ ...form, subject: next });
      requestAnimationFrame(() => {
        el?.focus();
        const pos = start + token.length;
        el?.setSelectionRange(pos, pos);
      });
      return;
    }
    const el = bodyRef.current;
    const start = el?.selectionStart ?? form.body.length;
    const end = el?.selectionEnd ?? start;
    const next = form.body.slice(0, start) + token + form.body.slice(end);
    setForm({ ...form, body: next });
    setInsertTarget('body');
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + token.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const renderColumn = (
    title: string,
    channel: 'email' | 'sms',
    items: Template[],
  ) => (
    <section
      className={`template-col panel template-col-${channel}`}
      aria-label={`${title} templates`}
    >
      <div className={`template-col-head template-col-head-${channel}`}>
        <div>
          <h3>{title}</h3>
          <p className="muted" style={{ margin: 0 }}>
            {items.length} template{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => openNew(channel)}
        >
          Add {channel === 'email' ? 'email' : 'SMS'}
        </button>
      </div>
      <div className="template-col-body">
        {items.length === 0 ? (
          <div className="empty">No {title.toLowerCase()} templates yet.</div>
        ) : (
          <ul className="list">
            {items.map((t) => (
              <li key={t.id} className="list-row">
                <div>
                  <div className="title">{t.name}</div>
                  {t.subject ? (
                    <div className="meta">{formatTemplateForDisplay(t.subject)}</div>
                  ) : null}
                  <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap' }}>
                    {formatTemplateForDisplay(t.body)}
                  </p>
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
                      setInsertTarget('body');
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
    </section>
  );

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Templates</h2>
          <p className="muted" style={{ margin: 0 }}>
            Email on the left, SMS on the right. Tap insert chips to add customer
            details automatically.
          </p>
        </div>
      </div>

      <div className="template-split">
        {renderColumn('Email', 'email', emailTemplates)}
        {renderColumn('SMS', 'sms', smsTemplates)}
      </div>

      {open ? (
        <div className="drawer-overlay" role="dialog" aria-modal="true">
          <div className="drawer">
            <h3>
              {editingId ? 'Edit' : 'New'} {form.channel === 'email' ? 'email' : 'SMS'} template
            </h3>
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
                Template name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <div className="insert-chips" role="group" aria-label="Insert customer fields">
                <span className="insert-chips-label">Insert</span>
                {TEMPLATE_INSERTS.map((chip) => (
                  <button
                    key={chip.token}
                    type="button"
                    className="insert-chip"
                    onClick={() => insertChip(chip.token)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              {form.channel === 'email' ? (
                <label className="field">
                  Subject
                  <input
                    ref={subjectRef}
                    value={form.subject}
                    onFocus={() => setInsertTarget('subject')}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </label>
              ) : null}
              <label className="field">
                Message
                <textarea
                  ref={bodyRef}
                  required
                  value={form.body}
                  onFocus={() => setInsertTarget('body')}
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
