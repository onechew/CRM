import type { CrmState } from '../types';

function isoNow() {
  return new Date().toISOString();
}

/** Fresh empty CRM — no demo contacts. Templates only (reusable drafts). */
export function createSeedState(): CrmState {
  const now = isoNow();

  const templates = [
    {
      id: 'tpl-intro-email',
      name: 'Intro — cladding capabilities',
      channel: 'email' as const,
      subject: 'Future Buildings — quick intro for {{company}}',
      body: `Hi {{name}},

Josh Schwartz here with Future Buildings Inc. We help Ontario builders with cladding and steel solutions that keep schedules tight.

Happy to share a short capability sheet or walk a job with you — whatever is most useful.

Best,
Josh Schwartz
Future Buildings Inc.
jschwartz@torosteel.com`,
      updatedAt: now,
    },
    {
      id: 'tpl-follow-sms',
      name: 'Follow-up SMS — check-in',
      channel: 'sms' as const,
      body: `Hi {{name}}, Josh at Future Buildings. Circling back on cladding for {{company}} — any questions I can answer? Reply STOP to opt out.`,
      updatedAt: now,
    },
    {
      id: 'tpl-quote-email',
      name: 'Quote ready',
      channel: 'email' as const,
      subject: 'Quote ready — {{company}}',
      body: `Hi {{name}},

Your preliminary quote is ready. I can walk you through options and lead times whenever works.

Josh Schwartz
Future Buildings Inc.`,
      updatedAt: now,
    },
  ];

  return {
    contacts: [],
    logs: [],
    templates,
    scheduled: [],
    notifications: [],
    seeded: true,
  };
}
