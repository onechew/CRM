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

  const rowCount = Math.max(emailTemplates.length, smsTemplates.length, 1);

  const openNew = (channel: 'email' | 'sms') => {
    setEditingId(null);
    setForm({ name: '', channel, subject: '', body: '' });
    setInsertTarget('body');
    setOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      channel: t.channel,
      subject: t.subject ?? '',
      body: t.body,
    });
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

  const renderCard = (t: Template | undefined, channel: 'email' | 'sms') => {
    if (!t) {
      return (
        <div className={`template-cell template-cell-empty template-cell-${channel}`}>
          <p className="muted" style={{ margin: 0 }}>
            No {channel === 'email' ? 'email' : 'SMS'} template in this row
          </p>
        </div>
      );
    }
    return (
      <div className={`template-cell template-cell-${channel}`}>
        <div className="template-cell-main">
          <div className="title">{t.name}</div>
          {t.subject ? (
            <div className="meta">{formatTemplateForDisplay(t.subject)}</div>
          ) : null}
          <p className="template-cell-body">{formatTemplateForDisplay(t.body)}</p>
        </div>
        <div className="template-cell-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openEdit(t)}
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
      </div>
    );
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Templates</h2>
          <p className="muted" style={{ margin: 0 }}>
            Email on the left, SMS on the right. Use insert chips for customer details.
          </p>
        </div>
      </div>

      <div className="template-board" style={{ ['--template-rows' as string]: String(rowCount) }}>
        <div className="template-col-head template-col-head-email">
          <div>
            <h3>Email</h3>
            <p className="muted" style={{ margin: 0 }}>
              {emailTemplates.length} template{emailTemplates.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openNew('email')}
          >
            Add email
          </button>
        </div>
        <div className="template-col-head template-col-head-sms">
          <div>
            <h3>SMS</h3>
            <p className="muted" style={{ margin: 0 }}>
              {smsTemplates.length} template{smsTemplates.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openNew('sms')}
          >
            Add SMS
          </button>
        </div>

        {Array.from({ length: rowCount }, (_, i) => (
          <div key={`row-${i}`} className="template-row-pair" style={{ gridColumn: '1 / -1' }}>
            {renderCard(emailTemplates[i], 'email')}
            {renderCard(smsTemplates[i], 'sms')}
          </div>
        ))}
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
