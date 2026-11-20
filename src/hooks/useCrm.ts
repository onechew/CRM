import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  AppNotification,
  CommLogEntry,
  Contact,
  CrmState,
  MessageChannel,
  OwnerProfile,
  ScheduledItem,
  Template,
} from '../types';
import { loadState, resetToSeed, saveState } from '../storage/store';

function touch() {
  return new Date().toISOString();
}

export function useCrm() {
  const [state, setState] = useState<CrmState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const update = useCallback((fn: (prev: CrmState) => CrmState) => {
    setState((prev) => fn(prev));
  }, []);

  const contactsSorted = useMemo(
    () =>
      [...state.contacts].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [state.contacts],
  );

  const searchContacts = useCallback(
    (q: string) => {
      const needle = q.trim().toLowerCase();
      if (!needle) return contactsSorted;
      return contactsSorted.filter((c) => {
        const hay = [c.name, c.company, c.email, c.phone, c.notes]
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
    },
    [contactsSorted],
  );

  const getContact = useCallback(
    (id: string) => state.contacts.find((c) => c.id === id),
    [state.contacts],
  );

  const upsertContact = useCallback(
    (
      input: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'caslConsent'> & {
        id?: string;
      },
    ) => {
      const now = touch();
      const region = input.region === 'US' ? 'US' : 'CA';
      update((prev) => {
        if (input.id) {
          return {
            ...prev,
            contacts: prev.contacts.map((c) =>
              c.id === input.id
                ? {
                    ...c,
                    name: input.name,
                    company: input.company,
                    phone: input.phone,
                    email: input.email,
                    notes: input.notes,
                    region,
                    caslConsent: true,
                    updatedAt: now,
                  }
                : c,
            ),
          };
        }
        const contact: Contact = {
          id: uuid(),
          name: input.name,
          company: input.company,
          phone: input.phone,
          email: input.email,
          notes: input.notes,
          region,
          caslConsent: true,
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, contacts: [...prev.contacts, contact] };
      });
    },
    [update],
  );

  const updateOwner = useCallback(
    (patch: Partial<OwnerProfile>) => {
      update((prev) => ({
        ...prev,
        owner: { ...prev.owner, ...patch },
      }));
    },
    [update],
  );

  const deleteContact = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        contacts: prev.contacts.filter((c) => c.id !== id),
        logs: prev.logs.filter((l) => l.contactId !== id),
        scheduled: prev.scheduled.filter((s) => s.contactId !== id),
        notifications: prev.notifications.filter((n) => n.contactId !== id),
      }));
    },
    [update],
  );

  const logsFor = useCallback(
    (contactId: string) =>
      state.logs
        .filter((l) => l.contactId === contactId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.logs],
  );

  const addLog = useCallback(
    (
      entry: Omit<CommLogEntry, 'id' | 'createdAt'> & { createdAt?: string },
    ) => {
      const log: CommLogEntry = {
        ...entry,
        id: uuid(),
        createdAt: entry.createdAt ?? touch(),
      };
      update((prev) => ({ ...prev, logs: [log, ...prev.logs] }));
    },
    [update],
  );

  const upsertTemplate = useCallback(
    (
      input: Omit<Template, 'id' | 'updatedAt'> & { id?: string },
    ) => {
      const now = touch();
      update((prev) => {
        if (input.id) {
          return {
            ...prev,
            templates: prev.templates.map((t) =>
              t.id === input.id
                ? {
                    ...t,
                    name: input.name,
                    channel: input.channel,
                    subject: input.subject,
                    body: input.body,
                    updatedAt: now,
                  }
                : t,
            ),
          };
        }
        return {
          ...prev,
          templates: [
            ...prev.templates,
            {
              id: uuid(),
              name: input.name,
              channel: input.channel,
              subject: input.subject,
              body: input.body,
              updatedAt: now,
            },
          ],
        };
      });
    },
    [update],
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        templates: prev.templates.filter((t) => t.id !== id),
      }));
    },
    [update],
  );

  const scheduledFor = useCallback(
    (contactId: string) =>
      state.scheduled
        .filter((s) => s.contactId === contactId)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [state.scheduled],
  );

  const upsertScheduled = useCallback(
    (
      input: Omit<ScheduledItem, 'id' | 'createdAt' | 'updatedAt'> & {
        id?: string;
      },
    ) => {
      const now = touch();
      update((prev) => {
        if (input.id) {
          return {
            ...prev,
            scheduled: prev.scheduled.map((s) =>
              s.id === input.id
                ? {
                    ...s,
                    contactId: input.contactId,
                    channel: input.channel,
                    sequenceId: input.sequenceId,
                    subject: input.subject,
                    body: input.body,
                    dueAt: input.dueAt,
                    status: input.status,
                    updatedAt: now,
                  }
                : s,
            ),
          };
        }
        return {
          ...prev,
          scheduled: [
            ...prev.scheduled,
            {
              id: uuid(),
              contactId: input.contactId,
              channel: input.channel,
              sequenceId: input.sequenceId,
              subject: input.subject,
              body: input.body,
              dueAt: input.dueAt,
              status: input.status,
              createdAt: now,
              updatedAt: now,
            },
          ],
        };
      });
    },
    [update],
  );

  const cancelScheduled = useCallback(
    (id: string) => {
      const now = touch();
      update((prev) => ({
        ...prev,
        scheduled: prev.scheduled.map((s) =>
          s.id === id ? { ...s, status: 'cancelled', updatedAt: now } : s,
        ),
      }));
    },
    [update],
  );

  const completeScheduled = useCallback(
    (id: string) => {
      const now = touch();
      update((prev) => {
        const item = prev.scheduled.find((s) => s.id === id);
        if (!item) return prev;
        const log: CommLogEntry = {
          id: uuid(),
          contactId: item.contactId,
          channel: item.channel === 'call' ? 'call' : item.channel,
          direction: 'outbound',
          subject: item.subject,
          body: item.body,
          createdAt: now,
        };
        return {
          ...prev,
          scheduled: prev.scheduled.map((s) =>
            s.id === id ? { ...s, status: 'completed', updatedAt: now } : s,
          ),
          logs: [log, ...prev.logs],
        };
      });
    },
    [update],
  );

  /** Mark reply received: stop remaining pending/due items in same sequence (or all pending for contact if no sequence). */
  const markReplyReceived = useCallback(
    (contactId: string, channel: MessageChannel | 'any' = 'any') => {
      const now = touch();
      update((prev) => {
        const active = prev.scheduled.filter(
          (s) =>
            s.contactId === contactId &&
            (s.status === 'pending' || s.status === 'due'),
        );
        const sequenceIds = new Set(
          active.map((s) => s.sequenceId).filter(Boolean) as string[],
        );

        const stopped = prev.scheduled.map((s) => {
          if (s.contactId !== contactId) return s;
          if (s.status !== 'pending' && s.status !== 'due') return s;
          if (sequenceIds.size > 0) {
            if (s.sequenceId && sequenceIds.has(s.sequenceId)) {
              return { ...s, status: 'stopped' as const, updatedAt: now };
            }
            return s;
          }
          return { ...s, status: 'stopped' as const, updatedAt: now };
        });

        const stoppedCount = stopped.filter(
          (s, i) => s.status === 'stopped' && prev.scheduled[i].status !== 'stopped',
        ).length;

        const contact = prev.contacts.find((c) => c.id === contactId);
        const note: AppNotification = {
          id: uuid(),
          type: 'reply_received',
          contactId,
          message: `${contact?.name ?? 'Contact'} replied${
            channel !== 'any' ? ` (${channel})` : ''
          }. Stopped ${stoppedCount} scheduled follow-up${stoppedCount === 1 ? '' : 's'}.`,
          read: false,
          createdAt: now,
        };

        const log: CommLogEntry = {
          id: uuid(),
          contactId,
          channel: channel === 'any' || channel === 'call' ? 'note' : channel,
          direction: 'inbound',
          body: `Reply received. Remaining auto follow-ups stopped.`,
          createdAt: now,
        };

        return {
          ...prev,
          scheduled: stopped,
          notifications: [note, ...prev.notifications],
          logs: [log, ...prev.logs],
        };
      });
    },
    [update],
  );

  const dismissNotification = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      }));
    },
    [update],
  );

  const todayItems = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return state.scheduled
      .filter((s) => {
        if (s.status !== 'pending' && s.status !== 'due') return false;
        const due = new Date(s.dueAt);
        return due <= end; // overdue + due today
      })
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }, [state.scheduled]);

  const unreadNotifications = useMemo(
    () => state.notifications.filter((n) => !n.read),
    [state.notifications],
  );

  const hardReset = useCallback(() => {
    setState(resetToSeed());
  }, []);

  return {
    state,
    contactsSorted,
    searchContacts,
    getContact,
    upsertContact,
    updateOwner,
    deleteContact,
    logsFor,
    addLog,
    upsertTemplate,
    deleteTemplate,
    scheduledFor,
    upsertScheduled,
    cancelScheduled,
    completeScheduled,
    markReplyReceived,
    dismissNotification,
    todayItems,
    unreadNotifications,
    hardReset,
  };
}

export type CrmApi = ReturnType<typeof useCrm>;
