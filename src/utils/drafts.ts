import type { Contact } from '../types';

export function fillTemplate(
  text: string,
  contact: Pick<Contact, 'name' | 'company' | 'email' | 'phone'>,
) {
  return text
    .replaceAll('{{name}}', contact.name.split(' ')[0] || contact.name)
    .replaceAll('{{fullName}}', contact.name)
    .replaceAll('{{company}}', contact.company)
    .replaceAll('{{email}}', contact.email)
    .replaceAll('{{phone}}', contact.phone);
}

/** Show plain labels instead of {{tokens}} for salespeople */
export function formatTemplateForDisplay(text: string) {
  return text
    .replaceAll('{{name}}', '[Customer first name]')
    .replaceAll('{{fullName}}', '[Customer name]')
    .replaceAll('{{company}}', '[Company]')
    .replaceAll('{{email}}', '[Customer email]')
    .replaceAll('{{phone}}', '[Customer phone]');
}

export const TEMPLATE_INSERTS = [
  { label: 'Customer first name', token: '{{name}}' },
  { label: 'Customer name', token: '{{fullName}}' },
  { label: 'Company', token: '{{company}}' },
] as const;


export function mailtoHref(email: string, subject?: string, body?: string) {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const q = params.toString();
  return `mailto:${encodeURIComponent(email)}${q ? `?${q}` : ''}`;
}

/** sms: URI — works on iOS/Android; body support varies by OS */
export function smsHref(phone: string, body?: string) {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!body) return `sms:${cleaned}`;
  return `sms:${cleaned}?&body=${encodeURIComponent(body)}`;
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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
