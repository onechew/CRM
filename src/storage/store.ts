import type { CrmState } from '../types';
import { createSeedState } from '../data/seed';

/** v2: empty contacts (no demo/sample data). Migrates away from v1 seed. */
const STORAGE_KEY = 'fbi-crm-v2';
const LEGACY_KEYS = ['fbi-crm-v1'];

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
    return parsed;
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
