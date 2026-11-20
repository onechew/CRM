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
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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

function yearOptions(around: number) {
  const years: number[] = [];
  for (let y = around - 5; y <= around + 5; y++) years.push(y);
  return years;
}

function shortTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(/\s*(a\.?\s*m\.?|p\.?\s*m\.?)/i, (_, mer: string) =>
    /p/i.test(mer) ? ' PM' : ' AM',
  );
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
    const prevMonthDays = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth(),
      0,
    ).getDate();

    const cells: Array<{ date: Date; inMonth: boolean; key: string }> = [];
    for (let i = startPad - 1; i >= 0; i--) {
      const date = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() - 1,
        prevMonthDays - i,
      );
      cells.push({ date, inMonth: false, key: dayKey(date) });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
      cells.push({ date, inMonth: true, key: dayKey(date) });
    }
    let next = 1;
    while (cells.length % 7 !== 0) {
      const date = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth() + 1,
        next++,
      );
      cells.push({ date, inMonth: false, key: dayKey(date) });
    }
    return cells;
  }, [monthCursor]);

  const selectedItems = byDay.get(selectedDay) ?? [];
  const todayKey = dayKey(new Date());
  const years = useMemo(
    () => yearOptions(Math.max(monthCursor.getFullYear(), new Date().getFullYear())),
    [monthCursor],
  );

  const goToday = () => {
    const now = new Date();
    setMonthCursor(startOfMonth(now));
    setSelectedDay(dayKey(now));
  };

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

  const selectedLabel = new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Schedule</h2>
          <p className="muted" style={{ margin: 0 }}>
            Plan follow-ups on the calendar. Click a day to add one.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openNew()}>
          New follow-up
        </button>
      </div>

      <div className="gcal">
        <div className="gcal-main">
          <div className="gcal-toolbar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={goToday}>
              Today
            </button>
            <div className="gcal-arrows" role="group" aria-label="Month navigation">
              <button
                type="button"
                className="gcal-icon-btn"
                onClick={() => setMonthCursor((m) => addMonths(m, -1))}
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                className="gcal-icon-btn"
                onClick={() => setMonthCursor((m) => addMonths(m, 1))}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            <div className="gcal-title-pickers">
              <select
                className="gcal-title-select"
                value={monthCursor.getMonth()}
                aria-label="Month"
                onChange={(e) => {
                  setMonthCursor(
                    new Date(monthCursor.getFullYear(), Number(e.target.value), 1),
                  );
                }}
              >
                {MONTHS.map((label, idx) => (
                  <option key={label} value={idx}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className="gcal-title-select"
                value={monthCursor.getFullYear()}
                aria-label="Year"
                onChange={(e) => {
                  setMonthCursor(
                    new Date(Number(e.target.value), monthCursor.getMonth(), 1),
                  );
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="gcal-weekdays" aria-hidden="true">
            {WEEKDAYS.map((d) => (
              <div key={d} className="gcal-weekday">
                {d}
              </div>
            ))}
          </div>

          <div className="gcal-grid" role="grid" aria-label="Month">
            {calendarCells.map((cell) => {
              const items = byDay.get(cell.key) ?? [];
              const isSelected = cell.key === selectedDay;
              const isToday = cell.key === todayKey;
              return (
                <div
                  key={cell.key}
                  role="gridcell"
                  tabIndex={0}
                  className={[
                    'gcal-cell',
                    cell.inMonth ? '' : 'is-outside',
                    isSelected ? 'is-selected' : '',
                    isToday ? 'is-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setSelectedDay(cell.key);
                    openNew(cell.key);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDay(cell.key);
                      openNew(cell.key);
                    }
                  }}
                >
                  <span className={`gcal-date${isToday ? ' is-today' : ''}`}>
                    {cell.date.getDate()}
                  </span>
                  <div className="gcal-chips">
                    {items.slice(0, 3).map((item) => {
                      const c = getContact(item.contactId);
                      const name = c?.name ?? 'Unknown';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`gcal-chip gcal-chip-${item.channel}`}
                          title={`${name} · ${item.channel} · ${shortTime(item.dueAt)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDay(cell.key);
                            setDetailItem(item);
                          }}
                        >
                          <span className="gcal-chip-dot" aria-hidden="true" />
                          <span className="gcal-chip-label">{name}</span>
                        </button>
                      );
                    })}
                    {items.length > 3 ? (
                      <button
                        type="button"
                        className="gcal-more"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(cell.key);
                        }}
                      >
                        +{items.length - 3} more
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="gcal-side" aria-label="Selected day">
          <div className="gcal-side-head">
            <h3>{selectedLabel}</h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openNew(selectedDay)}
            >
              Add
            </button>
          </div>
          {selectedItems.length === 0 ? (
            <p className="gcal-side-empty">No follow-ups. Click the day or Add to create one.</p>
          ) : (
            <ul className="gcal-side-list">
              {selectedItems.map((s) => {
                const c = getContact(s.contactId);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="gcal-side-item"
                      onClick={() => setDetailItem(s)}
                    >
                      <span className={`gcal-side-bar gcal-chip-${s.channel}`} aria-hidden="true" />
                      <span className="gcal-side-copy">
                        <span className="gcal-side-time">{shortTime(s.dueAt)}</span>
                        <span className="gcal-side-name">
                          {c?.name ?? 'Unknown'}
                          {c?.company ? ` · ${c.company}` : ''}
                        </span>
                        <span className="gcal-side-channel">{s.channel}</span>
                        {s.subject ? <span className="gcal-side-subject">{s.subject}</span> : null}
                        <span className="gcal-side-body">{s.body}</span>
                      </span>
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
