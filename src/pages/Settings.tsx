import { useState } from 'react';
import { Toast } from '../components/Toast';
import { useCrmContext } from '../context/CrmContext';

export function SettingsPage() {
  const { state, updateOwner } = useCrmContext();
  const [form, setForm] = useState(state.owner);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>Your profile</h2>
          <p className="muted">
            Send-from email and 🇨🇦 / 🇺🇸 phone lines. Customer region on each
            contact picks which line to use for SMS and call drafts.
          </p>
        </div>
      </div>

      <div className="panel panel-pad owner-card">
        <p className="owner-label">Owner</p>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            updateOwner(form);
            setToast('Profile saved');
          }}
        >
          <div className="form-grid two">
            <label className="field">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="field">
              Company
              <input
                required
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            Email (send-from)
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <div className="form-grid two">
            <label className="field">
              🇨🇦 Phone
              <input
                required
                inputMode="tel"
                placeholder="+1-437-566-5598"
                value={form.phoneCA}
                onChange={(e) => setForm({ ...form, phoneCA: e.target.value })}
              />
            </label>
            <label className="field">
              🇺🇸 Phone
              <input
                inputMode="tel"
                placeholder="+1-XXX-XXX-XXXX (add your 🇺🇸 line)"
                value={form.phoneUS}
                onChange={(e) => setForm({ ...form, phoneUS: e.target.value })}
              />
            </label>
          </div>
          {!form.phoneUS.trim() ? (
            <p className="casl-note">
              🇺🇸 number not set yet. Contacts marked 🇺🇸 will prompt you to add it
              here before SMS/call from-line hints are complete.
            </p>
          ) : null}
          <p className="casl-note">
            Drafts still open in your mail or Messages app. Nothing auto-sends.
          </p>
          <div className="actions">
            <button type="submit" className="btn btn-primary">
              Save profile
            </button>
          </div>
        </form>
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
