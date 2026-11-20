import { OWNER } from '../data/owner';

export function SettingsPage() {
  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Your profile</h2>
          <p className="muted">
            Send-from details for drafts. Email and SMS are not auto-sent yet.
          </p>
        </div>
      </div>

      <div className="panel panel-pad owner-card">
        <p className="owner-label">Owner</p>
        <h3 className="owner-name">{OWNER.name}</h3>
        <p className="owner-company">{OWNER.company}</p>

        <dl className="owner-facts">
          <div>
            <dt>Email (send-from)</dt>
            <dd>
              <a className="mono owner-link" href={`mailto:${OWNER.email}`}>
                {OWNER.email}
              </a>
            </dd>
          </div>
          <div>
            <dt>Phone (SMS / calls)</dt>
            <dd>
              <a
                className="mono owner-link"
                href={`tel:${OWNER.phone.replace(/[^\d+]/g, '')}`}
              >
                {OWNER.phoneDisplay}
              </a>
            </dd>
          </div>
        </dl>

        <p className="casl-note" style={{ marginTop: '1.25rem' }}>
          Drafts open in your mail or Messages app using these as your identity.
          When you send real SMS later, honour STOP / ARRÊT promptly.
        </p>
      </div>
    </div>
  );
}
