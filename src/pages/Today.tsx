import { Link } from 'react-router-dom';
import { DraftActions } from '../components/DraftActions';
import { useCrmContext } from '../context/CrmContext';
import { formatWhen, isOverdue } from '../utils/drafts';

export function TodayPage() {
  const {
    todayItems,
    unreadNotifications,
    getContact,
    dismissNotification,
    completeScheduled,
    cancelScheduled,
  } = useCrmContext();

  return (
    <div>
      <section className="hero" aria-label="Future Buildings Today">
        <div className="hero-brand">Future Buildings</div>
        <h1>Today for Josh Schwartz</h1>
        <p>
          Pending follow-ups and reply alerts — open a draft on your phone or mail
          client when you are ready. Nothing auto-sends.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/contacts">
            Browse contacts
          </Link>
          <Link className="btn btn-secondary" to="/schedule">
            Schedule follow-up
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
