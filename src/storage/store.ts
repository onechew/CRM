import { OWNER_DEFAULTS } from '../data/owner';
import { createSeedState } from '../data/seed';
import type { Contact, CrmState, OwnerProfile } from '../types';

/** v3: owner CA/US phones + contact region. Clears older keys. */
const STORAGE_KEY = 'fbi-crm-v3';
const LEGACY_KEYS = ['fbi-crm-v1', 'fbi-crm-v2'];

function normalizeOwner(raw: Partial<OwnerProfile> | undefined): OwnerProfile {
  return {
    name: raw?.name?.trim() || OWNER_DEFAULTS.name,
    company: raw?.company?.trim() || OWNER_DEFAULTS.company,
    email: raw?.email?.trim() || OWNER_DEFAULTS.email,
    phoneCA: raw?.phoneCA?.trim() || OWNER_DEFAULTS.phoneCA,
    phoneUS: raw?.phoneUS ?? OWNER_DEFAULTS.phoneUS,
  };
}

function normalizeContact(c: Contact): Contact {
  return {
    ...c,
    region: c.region === 'US' ? 'US' : 'CA',
  };
}

function normalizeState(parsed: CrmState): CrmState {
  return {
    ...parsed,
    owner: normalizeOwner(parsed.owner),
    contacts: Array.isArray(parsed.contacts)
      ? parsed.contacts.map((c) => normalizeContact(c as Contact))
      : [],
    logs: parsed.logs ?? [],
    templates: parsed.templates ?? [],
    scheduled: parsed.scheduled ?? [],
    notifications: parsed.notifications ?? [],
    seeded: true,
  };
}

export function loadState(): CrmState {
  try {
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedState();
      saveState(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as CrmState;
    if (!parsed.seeded || !Array.isArray(parsed.contacts)) {
      const seeded = createSeedState();
      saveState(seeded);
      return seeded;
    }
    return normalizeState(parsed);
  } catch {
    const seeded = createSeedState();
    saveState(seeded);
    return seeded;
  }
}

export function saveState(state: CrmState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetToSeed(): CrmState {
  const seeded = createSeedState();
  saveState(seeded);
  return seeded;
}
