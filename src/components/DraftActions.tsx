import { useState } from 'react';
import type { Contact, MessageChannel } from '../types';
import { copyText, mailtoHref, smsHref } from '../utils/drafts';
import { Toast } from './Toast';

export function DraftActions({
  contact,
  channel,
  subject,
  body,
  onLogged,
}: {
  contact: Contact;
  channel: MessageChannel;
  subject?: string;
  body: string;
  onLogged?: () => void;
}) {
  const [toast, setToast] = useState<string | null>(null);

  if (channel === 'call') {
    return (
      <div className="actions">
        {contact.phone ? (
          <a className="btn btn-primary btn-sm" href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}>
            Call
          </a>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={async () => {
            await copyText(body);
            setToast('Reminder copied');
            onLogged?.();
          }}
        >
          Copy note
        </button>
        <Toast message={toast} onDone={() => setToast(null)} />
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
        <Toast message={toast} onDone={() => setToast(null)} />
      </div>
    );
  }

  return (
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
          await copyText(body);
          setToast('SMS draft copied — paste in Messages');
        }}
      >
        Copy draft
      </button>
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
