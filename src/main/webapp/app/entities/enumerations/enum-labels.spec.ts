import { describe, expect, it } from 'vitest';

import accountStatus from '../../../i18n/en/directory-accountStatus.json';
import auditLevel from '../../../i18n/en/platform-auditLevel.json';
import credentialRole from '../../../i18n/en/platform-credentialRole.json';
import facilityType from '../../../i18n/en/platform-facilityType.json';
import idType from '../../../i18n/en/directory-idType.json';
import messageChannel from '../../../i18n/en/operations-messageChannel.json';
import messageStatus from '../../../i18n/en/operations-messageStatus.json';
import planTier from '../../../i18n/en/catalogue-planTier.json';
import priority from '../../../i18n/en/operations-priority.json';
import professionalRole from '../../../i18n/en/directory-professionalRole.json';
import serviceHealth from '../../../i18n/en/platform-serviceHealth.json';
import sex from '../../../i18n/en/directory-sex.json';
import shiftType from '../../../i18n/en/operations-shiftType.json';
import taskState from '../../../i18n/en/operations-taskState.json';
import title from '../../../i18n/en/directory-title.json';
import verificationStatus from '../../../i18n/en/directory-verificationStatus.json';

/**
 * No enum label is still the constant it labels.
 *
 * <p>JHipster generates these dictionaries with the constant as its own translation —
 * `"DOCTOR": "DOCTOR"` — which resolves, so nothing anywhere reports it. It just puts `ON_LEAVE`
 * and `PATIENT_APP` on screen in entity tables and filters, beside console screens that say
 * "On leave" for the very same value out of `console.status`.
 *
 * <p>Regenerating an entity rewrites its dictionary back to the placeholder form, and that is the
 * regression this catches. `null` is exempt: it is deliberately empty.
 *
 * <p>The imports are explicit because the file list is the assertion — a new enum with no entry
 * here is not covered, and a glob would hide that behind a passing test.
 */
const DICTIONARIES = [
  accountStatus,
  auditLevel,
  credentialRole,
  facilityType,
  idType,
  messageChannel,
  messageStatus,
  planTier,
  priority,
  professionalRole,
  serviceHealth,
  sex,
  shiftType,
  taskState,
  title,
  verificationStatus,
];

const labels: [string, string, string][] = DICTIONARIES.flatMap(dictionary =>
  Object.entries(dictionary.hcAdminApp as Record<string, Record<string, string>>).flatMap(([namespace, values]) =>
    Object.entries(values)
      .filter(([constant]) => constant !== 'null')
      .map(([constant, label]): [string, string, string] => [`${namespace}.${constant}`, constant, label]),
  ),
);

describe('enum labels', () => {
  it('covers every enum dictionary', () => {
    expect(DICTIONARIES).toHaveLength(16);
    expect(labels.length).toBeGreaterThan(40);
  });

  it.each(labels)('%s is worded, not the constant', (_name, constant, label) => {
    expect(label).toBeTruthy();
    expect(label).not.toBe(constant);
  });
});
