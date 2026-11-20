import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { Modal } from '../components/Modal';
import { Toast } from '../components/Toast';
import { useCrmContext } from '../context/CrmContext';
import type { ScheduledItem } from '../types';
import {
  fillTemplate,
  formatWhen,
  fromLocalInputValue,
  toLocalInputValue,
} from '../utils/drafts';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a: string, b: string) {
  return a === b;
}

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
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [detailItem, setDetailItem] = useState<ScheduledItem | null>(null);
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

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduledItem[]>();
    for (const s of upcoming) {
      const key = dayKey(new Date(s.dueAt));
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [upcoming]);

  const calendarCells = useMemo(() => {
    const first = startOfMonth(monthCursor);
    const startPad = first.getDay();
    const daysInMonth = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth() + 1,
      0,
    ).getDate();
    const cells: Array<{ date: Date; inMonth: boolean; key: string } | null> = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
      cells.push({ date, inMonth: true, key: dayKey(date) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthCursor]);

  const selectedItems = byDay.get(selectedDay) ?? [];
  const todayKey = dayKey(new Date());
  const monthLabel = monthCursor.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

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

  const openNew = (day?: string) => {
    const base =
      day != null
        ? new Date(`${day}T10:00:00`)
        : new Date(Date.now() + 3600000);
    setForm({
      contactId: contactsSorted[0]?.id ?? '',
      channel: 'email',
      subject: '',
      body: '',
      dueAt: toLocalInputValue(base.toISOString()),
      asSequence: true,
      templateId: '',
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Schedule</h2>
          <p className="muted" style={{ margin: 0 }}>
            Month view of follow-ups and reminders by customer.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openNew()}>
          New follow-up
        </button>
      </div>

      <div className="schedule-layout">
        <section className="panel calendar-panel" aria-label="Month calendar">
          <div className="calendar-toolbar">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setMonthCursor((m) => addMonths(m, -1))}
              aria-label="Previous month"
            >
              Prev
            </button>
            <h3 className="calendar-month-label">{monthLabel}</h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setMonthCursor((m) => addMonths(m, 1))}
              aria-label="Next month"
            >
              Next
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((d) => (
              <div key={d} className="calendar-weekday">
                {d}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarCells.map((cell, i) => {
              if (!cell) {
                return <div key={`pad-${i}`} className="calendar-cell calendar-cell-pad" />;
              }
              const items = byDay.get(cell.key) ?? [];
              const isSelected = sameDay(cell.key, selectedDay);
              const isToday = sameDay(cell.key, todayKey);
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={`calendar-cell${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                  onClick={() => setSelectedDay(cell.key)}
                >
                  <span className="calendar-day-num">{cell.date.getDate()}</span>
                  <div className="calendar-events">
                    {items.slice(0, 3).map((item) => {
                      const c = getContact(item.contactId);
                      return (
                        <span
                          key={item.id}
                          className={`calendar-event calendar-event-${item.channel}`}
                          title={`${item.channel}: ${c?.name ?? 'Unknown'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDay(cell.key);
                            setDetailItem(item);
                          }}
                        >
                          <span className="calendar-event-channel">{item.channel}</span>
                          <span className="calendar-event-name">
                            {c?.name ?? 'Unknown'}
                          </span>
                        </span>
                      );
                    })}
                    {items.length > 3 ? (
                      <span className="calendar-more">+{items.length - 3} more</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel schedule-day-panel" aria-label="Selected day">
          <div className="panel-pad" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3>
              {new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              {selectedItems.length === 0
                ? 'Nothing scheduled this day.'
                : `${selectedItems.length} follow-up${selectedItems.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {selectedItems.length === 0 ? (
            <div className="empty">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openNew(selectedDay)}
              >
                New follow-up this day
              </button>
            </div>
          ) : (
            <ul className="list">
              {selectedItems.map((s) => {
                const c = getContact(s.contactId);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="list-row list-row-clickable schedule-day-row"
                      onClick={() => setDetailItem(s)}
                    >
                      <div>
                        <div className="actions" style={{ gap: '0.35rem' }}>
                          <span className={`chip ${s.channel}`}>{s.channel}</span>
                          {s.sequenceId ? <span className="chip">Sequence</span> : null}
                        </div>
                        <div className="title" style={{ marginTop: '0.35rem' }}>
                          {c?.name ?? 'Unknown'}
                          {c?.company ? ` · ${c.company}` : ''}
                        </div>
                        <div className="meta">{formatWhen(s.dueAt)}</div>
                        {s.subject ? <div className="meta">{s.subject}</div> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Schedule follow-up"
        footer={
          <div className="actions">
            <button type="submit" form="schedule-new-form" className="btn btn-primary">
              Save
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        }
      >
        <form
          id="schedule-new-form"
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const contact = getContact(form.contactId);
            if (!contact) return;
            const due = fromLocalInputValue(form.dueAt);
            if (form.asSequence && form.channel === 'email') {
              const seq = uuid();
              const base = new Date(due).getTime();
              const day = 24 * 60 * 60 * 1000;
              const smsTpl = state.templates.find((t) => t.channel === 'sms');
              const smsBody = fillTemplate(
                smsTpl?.body ??
                  `Hi [First name], Josh at Future Buildings checking in about [Company].`,
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
                body: `Call ${contact.name}${contact.company ? ` (${contact.company})` : ''} - follow-up after email/SMS.`,
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
            setSelectedDay(dayKey(new Date(due)));
            setMonthCursor(startOfMonth(new Date(due)));
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
                  {c.company ? ` - ${c.company}` : ''}
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
              <option value="">- none -</option>
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
                onChange={(e) => setForm({ ...form, asSequence: e.target.checked })}
              />
              <span>Queue sequence: email → SMS (+2 days) → call (+4 days)</span>
            </label>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={detailItem != null}
        onClose={() => setDetailItem(null)}
        title="Follow-up detail"
        footer={
          detailItem ? (
            <div className="actions">
              {getContact(detailItem.contactId) ? (
                <Link
                  className="btn btn-primary"
                  to={`/contacts/${detailItem.contactId}`}
                  onClick={() => setDetailItem(null)}
                >
                  Open contact
                </Link>
              ) : null}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  cancelScheduled(detailItem.id);
                  setDetailItem(null);
                  setToast('Cancelled');
                }}
              >
                Cancel item
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDetailItem(null)}
              >
                Close
              </button>
            </div>
          ) : null
        }
      >
        {detailItem ? (
          <div className="stack" style={{ gap: '0.65rem' }}>
            <div className="actions" style={{ gap: '0.35rem' }}>
              <span className={`chip ${detailItem.channel}`}>{detailItem.channel}</span>
              {detailItem.sequenceId ? <span className="chip">Sequence</span> : null}
            </div>
            <div className="title">
              {getContact(detailItem.contactId)?.name ?? 'Unknown'}
              {getContact(detailItem.contactId)?.company
                ? ` · ${getContact(detailItem.contactId)?.company}`
                : ''}
            </div>
            <div className="meta">{formatWhen(detailItem.dueAt)}</div>
            {detailItem.subject ? (
              <div className="meta">
                <strong>Subject:</strong> {detailItem.subject}
              </div>
            ) : null}
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{detailItem.body}</p>
          </div>
        ) : null}
      </Modal>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
