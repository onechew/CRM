import { useState, type ReactNode } from 'react';
import { ownerPhoneForRegion, regionFlag, regionLabel } from '../data/owner';
import type { Contact, MessageChannel, OwnerProfile } from '../types';
import { copyText, mailtoHref, smsHref } from '../utils/drafts';
import { Toast } from './Toast';

export function DraftActions({
  contact,
  owner,
  channel,
  subject,
  body,
  onLogged,
  extra,
}: {
  contact: Contact;
  owner: OwnerProfile;
  channel: MessageChannel;
  subject?: string;
  body: string;
  onLogged?: () => void;
  /** Extra buttons in the same bottom action row (primary + secondary only). */
  extra?: ReactNode;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const line = ownerPhoneForRegion(owner, contact.region ?? 'CA');

  const fromLine = (
    <p className="draft-from-line">
      Use your <strong>{line.flag} line</strong>
      {line.phone ? (
        <>
          : <span className="mono">{line.phone}</span>
        </>
      ) : (
        <> - add a 🇺🇸 number in Profile first</>
      )}
      <span className="draft-from-meta">
        {' '}
        (customer {regionFlag(contact.region ?? 'CA')} {regionLabel(contact.region ?? 'CA')})
      </span>
    </p>
  );

  if (channel === 'call') {
    return (
      <div className="stack" style={{ gap: '0.45rem' }}>
        {fromLine}
        <div className="actions">
          {contact.phone ? (
            <a
              className="btn btn-primary btn-sm"
              href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
            >
              Call contact
            </a>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              const note = line.phone
                ? `${body}\n\n(Call from your ${line.label}: ${line.phone})`
                : body;
              await copyText(note);
              setToast('Reminder copied');
              onLogged?.();
            }}
          >
            Copy note
          </button>
          {extra}
          <Toast message={toast} onDone={() => setToast(null)} />
        </div>
      </div>
    );
  }

  if (channel === 'email') {
    return (
      <div className="actions">
        <a
          className="btn btn-primary btn-sm"
          href={mailtoHref(contact.email, subject, body)}
          onClick={() => onLogged?.()}
        >
          Open email draft
        </a>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={async () => {
            const text = subject ? `Subject: ${subject}\n\n${body}` : body;
            await copyText(text);
            setToast('Email draft copied');
          }}
        >
          Copy draft
        </button>
        {extra}
        <Toast message={toast} onDone={() => setToast(null)} />
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: '0.45rem' }}>
      {fromLine}
      <div className="actions">
        <a
          className="btn btn-primary btn-sm"
          href={smsHref(contact.phone, body)}
          onClick={() => onLogged?.()}
        >
          Open SMS draft
        </a>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={async () => {
            const text = line.phone
              ? `${body}\n\n- send from your ${line.label} (${line.phone})`
              : body;
            await copyText(text);
            setToast(
              line.phone
                ? 'SMS draft copied. Send from your matching line'
                : 'SMS draft copied. Set US number in Profile',
            );
          }}
        >
          Copy draft
        </button>
        {extra}
        <Toast message={toast} onDone={() => setToast(null)} />
      </div>
    </div>
  );
}
