import { describe, expect, it } from 'vitest';

import { AccountStatus } from './account-status.model';
import { AuditLevel } from './audit-level.model';
import { CredentialRole } from './credential-role.model';
import { FacilityType } from './facility-type.model';
import { IdType } from './id-type.model';
import { MessageChannel } from './message-channel.model';
import { MessageStatus } from './message-status.model';
import { PlanTier } from './plan-tier.model';
import { Priority } from './priority.model';
import { ProfessionalRole } from './professional-role.model';
import { ServiceHealth } from './service-health.model';
import { Sex } from './sex.model';
import { ShiftType } from './shift-type.model';
import { TaskState } from './task-state.model';
import { Title } from './title.model';
import { VerificationStatus } from './verification-status.model';

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
 * Every enum value has a label, and no dictionary labels a value the enum no longer has.
 *
 * <p><b>This is the second of two specs over the same files, and the split is deliberate</b> — see
 * `duty-roster-resolution.md` § 9.1, decision 6, taken 2026-09-02. `enum-labels.spec.ts` beside this
 * one pins the <em>wording</em>: that no label is still the constant it labels, which is how JHipster
 * generates them (`"DOCTOR": "DOCTOR"`) and what regenerating an entity puts back. This one pins the
 * <em>coverage</em>: that the dictionary and the enum hold the same set of keys.
 *
 * <p>Neither subsumes the other, and the pair was chosen over merging them because each catches what
 * the other cannot. A coverage sweep is satisfied by `'FLEXIBLE': 'FLEXIBLE'`, which resolves, puts
 * the constant on the screen and reports nothing. An enumerated wording check reads the dictionaries
 * and never asks the enums anything, so a value added to a `.model.ts` with no label is invisible to
 * it — which is exactly what `FLEXIBLE` was until this file existed.
 *
 * <p>The estate's own precedent cuts both ways and that is the point. `PaginationIT` was rewritten to
 * <em>derive</em> its paths after eight entities escaped a hand-written list of 23, and the lesson —
 * "a test whose coverage has to be extended by hand silently stops covering things" — is about
 * coverage, not about wording. So coverage is derived here, and the wording stays enumerated there.
 * <b>Do not merge the two files.</b> They would have to argue with each other inside one comment
 * block, and the merged file would inherit whichever rationale the next reader happened to weigh
 * more.
 *
 * <p>The list below is enumerated for the same reason `enum-labels.spec.ts`'s is: the file list is
 * itself an assertion. A new enum with no entry here is not covered, and a glob would hide that
 * behind a passing test. The count at the bottom is what makes the omission fail rather than pass
 * quietly.
 */
const PAIRS: [string, Record<string, string>, Record<string, string>][] = [
  ['AccountStatus', AccountStatus, accountStatus.hcAdminApp.AccountStatus],
  ['AuditLevel', AuditLevel, auditLevel.hcAdminApp.AuditLevel],
  ['CredentialRole', CredentialRole, credentialRole.hcAdminApp.CredentialRole],
  ['FacilityType', FacilityType, facilityType.hcAdminApp.FacilityType],
  ['IdType', IdType, idType.hcAdminApp.IdType],
  ['MessageChannel', MessageChannel, messageChannel.hcAdminApp.MessageChannel],
  ['MessageStatus', MessageStatus, messageStatus.hcAdminApp.MessageStatus],
  ['PlanTier', PlanTier, planTier.hcAdminApp.PlanTier],
  ['Priority', Priority, priority.hcAdminApp.Priority],
  ['ProfessionalRole', ProfessionalRole, professionalRole.hcAdminApp.ProfessionalRole],
  ['ServiceHealth', ServiceHealth, serviceHealth.hcAdminApp.ServiceHealth],
  ['Sex', Sex, sex.hcAdminApp.Sex],
  ['ShiftType', ShiftType, shiftType.hcAdminApp.ShiftType],
  ['TaskState', TaskState, taskState.hcAdminApp.TaskState],
  ['Title', Title, title.hcAdminApp.Title],
  ['VerificationStatus', VerificationStatus, verificationStatus.hcAdminApp.VerificationStatus],
];

/** `null` is a deliberate empty entry in every dictionary and is not a value of any enum. */
const labelledValues = (dictionary: Record<string, string>): string[] => Object.keys(dictionary).filter(key => key !== 'null');

describe('enum label coverage', () => {
  it('covers every enum dictionary', () => {
    expect(PAIRS).toHaveLength(16);
  });

  it.each(PAIRS)('%s has a label for every value', (_name, values, dictionary) => {
    // Named rather than counted, so a failure says which key to write.
    expect(Object.values(values).filter(value => !(value in dictionary))).toEqual([]);
  });

  it.each(PAIRS)('%s labels no value it no longer has', (_name, values, dictionary) => {
    // The other direction, and the one that goes stale in silence: a retired value leaves behind a
    // label that reads perfectly and translates something nothing will ever send again.
    const known = new Set<string>(Object.values(values));

    expect(labelledValues(dictionary).filter(key => !known.has(key))).toEqual([]);
  });
});
