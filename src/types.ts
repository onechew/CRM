export type MessageChannel = 'email' | 'sms' | 'call';

export type ScheduledStatus = 'pending' | 'due' | 'completed' | 'cancelled' | 'stopped';

/** Customer location - picks which owner phone line to use for SMS/call drafts */
export type ContactRegion = 'CA' | 'US';

export interface OwnerProfile {
  name: string;
  company: string;
  email: string;
  /** Canada send-from / SMS line */
  phoneCA: string;
  /** US send-from / SMS line (editable; may be empty until set) */
  phoneUS: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  notes: string;
  /** Where the customer is - selects Josh's CA vs US line */
  region: ContactRegion;
  /** CASL: express or implied consent to receive CEMs */
  caslConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommLogEntry {
  id: string;
  contactId: string;
  channel: MessageChannel | 'note';
  direction: 'outbound' | 'inbound' | 'internal';
  subject?: string;
  body: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  channel: 'email' | 'sms';
  subject?: string;
  body: string;
  updatedAt: string;
}

export interface ScheduledItem {
  id: string;
  contactId: string;
  channel: MessageChannel;
  /** Groups steps in one follow-up sequence */
  sequenceId?: string;
  subject?: string;
  body: string;
  dueAt: string;
  status: ScheduledStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  type: 'reply_received' | 'info';
  contactId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CrmState {
  contacts: Contact[];
  logs: CommLogEntry[];
  templates: Template[];
  scheduled: ScheduledItem[];
  notifications: AppNotification[];
  owner: OwnerProfile;
  seeded: boolean;
}
