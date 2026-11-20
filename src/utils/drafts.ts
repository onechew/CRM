import type { Contact } from '../types';

export function fillTemplate(
  text: string,
  contact: Pick<Contact, 'name' | 'company' | 'email' | 'phone'>,
) {
  const first = contact.name.split(' ')[0] || contact.name;
  return text
    .replaceAll('[First name]', first)
    .replaceAll('[Full name]', contact.name)
    .replaceAll('[Company]', contact.company)
    .replaceAll('[Email]', contact.email)
    .replaceAll('[Phone]', contact.phone)
    // legacy curly tokens still fill if present in old saved templates
    .replaceAll('{{name}}', first)
    .replaceAll('{{fullName}}', contact.name)
    .replaceAll('{{company}}', contact.company)
    .replaceAll('{{email}}', contact.email)
    .replaceAll('{{phone}}', contact.phone);
}

/** Normalize any legacy {{tokens}} to readable brackets for display */
export function formatTemplateForDisplay(text: string) {
  return text
    .replaceAll('{{name}}', '[First name]')
    .replaceAll('{{fullName}}', '[Full name]')
    .replaceAll('{{company}}', '[Company]')
    .replaceAll('{{email}}', '[Email]')
    .replaceAll('{{phone}}', '[Phone]');
}

export const TEMPLATE_INSERTS = [
  { label: 'First name', token: '[First name]' },
  { label: 'Full name', token: '[Full name]' },
  { label: 'Company', token: '[Company]' },
] as const;


export function mailtoHref(email: string, subject?: string, body?: string) {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const q = params.toString();
  return `mailto:${encodeURIComponent(email)}${q ? `?${q}` : ''}`;
}

/** sms: URI - works on iOS/Android; body support varies by OS */
export function smsHref(phone: string, body?: string) {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!body) return `sms:${cleaned}`;
  return `sms:${cleaned}?&body=${encodeURIComponent(body)}`;
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

/** Force "AM" / "PM" (never a.m. / p.m.). */
function normalizeAmPm(raw: string) {
  return raw
    .replace(/\u202f|\u00a0/g, ' ')
    .replace(/\s*a\.?\s*m\.?/gi, ' AM')
    .replace(/\s*p\.?\s*m\.?/gi, ' PM');
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  const raw = d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return normalizeAmPm(raw);
}

export function isOverdue(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

export function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string) {
  return new Date(value).toISOString();
}
