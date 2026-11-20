import type { ContactRegion, OwnerProfile } from '../types';

/** Defaults for Josh at Future Buildings Inc. US number editable until provided. */
export const OWNER_DEFAULTS: OwnerProfile = {
  name: 'Josh Schwartz',
  company: 'Future Buildings Inc.',
  email: 'jschwartz@torosteel.com',
  phoneCA: '+1-437-566-5598',
  phoneUS: '',
};

export function ownerPhoneForRegion(
  owner: OwnerProfile,
  region: ContactRegion,
): { region: ContactRegion; phone: string; label: string } {
  if (region === 'US') {
    return {
      region: 'US',
      phone: owner.phoneUS.trim(),
      label: 'US line',
    };
  }
  return {
    region: 'CA',
    phone: owner.phoneCA.trim(),
    label: 'Canada line',
  };
}

export function regionLabel(region: ContactRegion) {
  return region === 'US' ? 'United States' : 'Canada';
}
