import type { CrmState } from '../types';
import { OWNER_DEFAULTS } from './owner';

/** Fresh CRM: one labeled Example contact + schedule so the UI is demoable. */
export function createSeedState(): CrmState {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
  const day = 24 * 60 * 60 * 1000;

  const templates = [
    {
      id: 'tpl-intro-email',
      name: 'Intro - cladding capabilities',
      channel: 'email' as const,
      subject: 'Future Buildings - quick intro for [Company]',
      body: `Hi [First name],

Josh Schwartz here with Future Buildings Inc. We help builders with cladding and steel solutions that keep schedules tight.

Happy to share a short capability sheet or walk a job with you, whatever is most useful.

Best,
Josh Schwartz
Future Buildings Inc.
jschwartz@torosteel.com`,
      updatedAt: iso(0),
    },
    {
      id: 'tpl-follow-sms',
      name: 'Follow-up SMS - check-in',
      channel: 'sms' as const,
      body: `Hi [First name], Josh at Future Buildings. Circling back on cladding for [Company]. Any questions I can answer?`,
      updatedAt: iso(0),
    },
    {
      id: 'tpl-quote-email',
      name: 'Quote ready',
      channel: 'email' as const,
      subject: 'Quote ready - [Company]',
      body: `Hi [First name],

Your preliminary quote is ready. I can walk you through options and lead times whenever works.

Josh Schwartz
Future Buildings Inc.`,
      updatedAt: iso(0),
    },
  ];

  const exampleContactId = 'c-example';
  const sequenceId = 'seq-example';

  return {
    contacts: [
      {
        id: exampleContactId,
        name: 'Example Contact',
        company: 'Example Builder Co.',
        phone: '+1-416-555-0100',
        email: 'example.contact@example-demo.dev',
        notes:
          'Example only. Safe to edit or delete. Region Canada uses your 🇨🇦 phone line for SMS/call drafts.',
        region: 'CA',
        caslConsent: true,
        createdAt: iso(-day),
        updatedAt: iso(-day),
      },
    ],
    logs: [
      {
        id: 'log-example-1',
        contactId: exampleContactId,
        channel: 'note',
        direction: 'internal',
        body: 'Example log entry. Replace with real history as you work.',
        createdAt: iso(-day),
      },
    ],
    templates,
    scheduled: [
      {
        id: 'sch-example-email',
        contactId: exampleContactId,
        channel: 'email',
        sequenceId,
        subject: 'Example - Future Buildings intro for Example Builder Co.',
        body: `Hi Example,

Josh Schwartz here with Future Buildings Inc. This is an example scheduled email draft so you can see Today and Schedule in action.

Best,
Josh Schwartz
Future Buildings Inc.
jschwartz@torosteel.com`,
        dueAt: iso(2 * 60 * 60 * 1000),
        status: 'pending',
        createdAt: iso(-60 * 60 * 1000),
        updatedAt: iso(-60 * 60 * 1000),
      },
    ],
    notifications: [],
    owner: { ...OWNER_DEFAULTS },
    seeded: true,
  };
}
