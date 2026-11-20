import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DraftActions } from '../components/DraftActions';
import { useCrmContext } from '../context/CrmContext';
import {
  TORONTO_TZ_LABEL,
  formatTorontoDate,
  formatTorontoTime,
  useTorontoWeather,
} from '../hooks/useTorontoWeather';
import { formatWhen, isOverdue } from '../utils/drafts';

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

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const weatherText = weather.loading
    ? 'Loading weather…'
    : weather.error
      ? weather.error
      : weather.tempC != null
        ? `${weather.tempC}°C · ${weather.label ?? 'Toronto'}`
        : 'Toronto';

  return (
    <div>
      <section className="hero hero-compact" aria-label="Today">
        <div className="hero-brand">{formatTorontoDate(now)}</div>
        <p className="hero-owner-name hero-meta-line">
          <span>{formatTorontoTime(now)}</span>
          <span aria-hidden="true">·</span>
          <span>{TORONTO_TZ_LABEL}</span>
          <span aria-hidden="true">·</span>
          <span>{weatherText}</span>
        </p>
        <div className="owner-strip" aria-label="Your send-from details">
          <div className="owner-strip-contacts">
            <a href={`mailto:${owner.email}`}>{owner.email}</a>
            <span aria-hidden="true">·</span>
            <span title="Canada line">🇨🇦 {owner.phoneCA || '—'}</span>
            <span aria-hidden="true">·</span>
            <span title="US line">
              🇺🇸 {owner.phoneUS.trim() ? owner.phoneUS : 'not set'}
            </span>
            <Link className="owner-strip-edit" to="/settings">
              Edit
            </Link>
          </div>
        </div>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/contacts">
            Contacts
          </Link>
          <Link className="btn btn-secondary" to="/schedule">
            Schedule
          </Link>
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

      <div className="panel">
        {todayItems.length === 0 ? (
          <div className="empty">You are clear — schedule the next touch when ready.</div>
        ) : (
          <ul className="list">
            {todayItems.map((item) => {
              const contact = getContact(item.contactId);
              if (!contact) return null;
              const overdue = isOverdue(item.dueAt);
              return (
                <li key={item.id} className="list-row">
                  <div className="stack">
                    <div className="actions" style={{ gap: '0.4rem' }}>
                      <span className={`chip ${item.channel}`}>{item.channel}</span>
                      {overdue ? <span className="chip warn">Overdue</span> : (
                        <span className="chip">Today</span>
                      )}
                      <span className="chip" title={contact.region === 'US' ? 'United States' : 'Canada'}>
                        {contact.region === 'US' ? '🇺🇸' : '🇨🇦'}
                      </span>
                    </div>
                    <Link className="title" to={`/contacts/${contact.id}`}>
                      {contact.name}
                      {contact.company ? ` · ${contact.company}` : ''}
                    </Link>
                    <div className="meta">{formatWhen(item.dueAt)}</div>
                    {item.subject ? <div className="meta">{item.subject}</div> : null}
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.body}</p>
                    <DraftActions
                      contact={contact}
                      owner={owner}
                      channel={item.channel}
                      subject={item.subject}
                      body={item.body}
                    />
                  </div>
                  <div className="actions" style={{ flexDirection: 'column' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => completeScheduled(item.id)}
                    >
                      Mark done
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
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
      </div>
    </div>
  );
}
