import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCrmContext } from '../context/CrmContext';
import {
  TORONTO_TZ_LABEL,
  formatTorontoDate,
  formatTorontoTime,
  useTorontoWeather,
} from '../hooks/useTorontoWeather';
import { copyText, formatWhen, isOverdue, mailtoHref, smsHref } from '../utils/drafts';
import { Toast } from '../components/Toast';

export function TodayPage() {
  const {
    state,
    todayItems,
    unreadNotifications,
    getContact,
    dismissNotification,
    completeScheduled,
    cancelScheduled,
  } = useCrmContext();
  const owner = state.owner;
  const weather = useTorontoWeather();
  const [now, setNow] = useState(() => new Date());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const weatherNode = weather.loading ? (
    <span className="hero-weather">Loading weather…</span>
  ) : weather.error ? (
    <span className="hero-weather">{weather.error}</span>
  ) : (
    <span className="hero-weather">
      <span className="hero-weather-icon" aria-hidden="true">
        {weather.icon ?? '🌡️'}
      </span>
      <span>
        {weather.tempC != null ? `${weather.tempC}°C` : '-'}
        {weather.label ? ` · ${weather.label}` : ''}
      </span>
    </span>
  );

  const openDraft = (item: (typeof todayItems)[number], contact: NonNullable<ReturnType<typeof getContact>>) => {
    if (item.channel === 'email') {
      window.location.href = mailtoHref(contact.email, item.subject, item.body);
      return;
    }
    if (item.channel === 'sms') {
      window.location.href = smsHref(contact.phone, item.body);
      return;
    }
    if (contact.phone) {
      window.location.href = `tel:${contact.phone.replace(/[^\d+]/g, '')}`;
    }
  };

  const copyDraft = async (item: (typeof todayItems)[number]) => {
    const text = item.subject ? `Subject: ${item.subject}\n\n${item.body}` : item.body;
    await copyText(text);
    setToast('Draft copied');
  };

  return (
    <div>
      <section className="hero hero-compact" aria-label="Today">
        <p className="hero-meta-line">
          <span className="hero-date">{formatTorontoDate(now)}</span>
          <span className="hero-sep" aria-hidden="true">
            ·
          </span>
          <span className="hero-time">{formatTorontoTime(now)}</span>
          <span className="hero-sep" aria-hidden="true">
            ·
          </span>
          <span className="hero-tz">{TORONTO_TZ_LABEL}</span>
          <span className="hero-sep" aria-hidden="true">
            ·
          </span>
          {weatherNode}
        </p>
        <div className="hero-toolbar">
          <p className="owner-strip owner-strip-contacts" aria-label="Your send-from details">
            <a href={`mailto:${owner.email}`}>{owner.email}</a>
            <span aria-hidden="true">·</span>
            <span title="Canada line">
              <span className="owner-flag" aria-hidden="true">
                🇨🇦
              </span>{' '}
              {owner.phoneCA || '-'}
            </span>
            <span aria-hidden="true">·</span>
            <span title="US line">
              <span className="owner-flag" aria-hidden="true">
                🇺🇸
              </span>{' '}
              {owner.phoneUS.trim() ? owner.phoneUS : 'not set'}
            </span>
            <Link className="owner-strip-edit" to="/settings">
              Edit
            </Link>
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/contacts">
              Contacts
            </Link>
            <Link className="btn btn-secondary" to="/schedule">
              Schedule
            </Link>
          </div>
        </div>
      </section>

      {unreadNotifications.map((n) => {
        const contact = getContact(n.contactId);
        return (
          <div key={n.id} className="notify-banner" role="status">
            <div>
              <strong>Reply received</strong>
              <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                {n.message}{' '}
                {contact ? (
                  <Link to={`/contacts/${contact.id}`}>View {contact.name}</Link>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => dismissNotification(n.id)}
            >
              Dismiss
            </button>
          </div>
        );
      })}

      <div className="section-head">
        <div>
          <h2>Due & overdue</h2>
          <p className="muted" style={{ margin: 0 }}>
            {todayItems.length === 0
              ? 'Nothing queued for today.'
              : `${todayItems.length} item${todayItems.length === 1 ? '' : 's'} need attention.`}
          </p>
        </div>
      </div>

      {todayItems.length === 0 ? (
        <div className="panel">
          <div className="empty">You are clear. Schedule the next touch when ready.</div>
        </div>
      ) : (
        <ul className="task-list">
          {todayItems.map((item) => {
            const contact = getContact(item.contactId);
            if (!contact) return null;
            const overdue = isOverdue(item.dueAt);
            const openLabel =
              item.channel === 'email'
                ? 'Open'
                : item.channel === 'sms'
                  ? 'Open'
                  : 'Call';
            return (
              <li key={item.id} className="task-card">
                <div className="task-card-meta">
                  <span className={`chip ${item.channel}`}>{item.channel}</span>
                  {overdue ? <span className="chip warn">Overdue</span> : <span className="chip">Today</span>}
                  <span className="task-card-when">{formatWhen(item.dueAt)}</span>
                  <span className="task-card-flag" title={contact.region === 'US' ? 'United States' : 'Canada'}>
                    {contact.region === 'US' ? '🇺🇸' : '🇨🇦'}
                  </span>
                </div>
                <Link className="task-card-title" to={`/contacts/${contact.id}`}>
                  {contact.name}
                  {contact.company ? ` · ${contact.company}` : ''}
                </Link>
                {item.subject ? <div className="task-card-subject">{item.subject}</div> : null}
                <p className="task-card-body">{item.body}</p>
                <div className="task-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openDraft(item, contact)}
                  >
                    {openLabel}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm task-card-copy"
                    onClick={() => copyDraft(item)}
                    title="Copy draft"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => completeScheduled(item.id)}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => cancelScheduled(item.id)}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
