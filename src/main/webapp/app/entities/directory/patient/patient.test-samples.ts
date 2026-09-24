import dayjs from 'dayjs/esm';

import { IPatient, NewPatient } from './patient.model';

/*
 * `accountId` is an hc-patient gateway account id. The `fixture-account-` prefix is
 * the api's own convention for a seeded value that names no real account, and these
 * samples borrow it so a reader of either repo recognises the shape. A unit-test
 * sample never has to resolve anywhere, which is the whole reason a fixture value is
 * right here. It is never a login and never an email.
 *
 * ⚠ Do NOT justify this by "hc-patient mints its account ids per seed, so nothing
 * could resolve" — that reading is FALSE and was corrected on 2026-09-25. Their
 * `SeedData.buildUser` takes a fixed id, `DevSeedDataInitializer` pins `user-1`…
 * `user-5`, their external seed document carries an optional `id`, and their quality
 * seed pins `user-demo-kojo` for `kojo@jac.net` — which is the address hc-admin's own
 * `dl-a15` link already names. Real ids therefore exist and the api's seed uses that
 * one; what makes a fixture right *here* is that a unit test needs no account at all.
 */
export const sampleWithRequiredData: IPatient = {
  id: '1b675df3-31ea-404e-b43c-e3a1e4dd1ad7',
  accountId: 'fixture-account-1b675df3',
  status: 'PENDING',
  joinedOn: dayjs('2023-12-10'),
};

export const sampleWithPartialData: IPatient = {
  id: '95732895-7b6b-4869-9787-5d89b002be37',
  accountId: 'fixture-account-95732895',
  status: 'UNDER_REVIEW',
  joinedOn: dayjs('2023-12-11'),
  lastActiveOn: dayjs('2023-12-11'),
  caseCount: 21451,
};

export const sampleWithFullData: IPatient = {
  id: '43abbb77-2599-407f-8e96-bde90617b39b',
  accountId: 'fixture-account-43abbb77',
  status: 'ACTIVE',
  joinedOn: dayjs('2023-12-10'),
  lastActiveOn: dayjs('2023-12-11'),
  caseCount: 8959,
};

/*
 * No `accountId`, and the omission is the fixture rather than a gap in it.
 *
 * A `NewPatient` is a record this console is about to create, and the console cannot
 * mint an hc-patient account — which is exactly why the Create button came off the
 * patient directory on 2026-08-28, the record it made having no account behind it.
 * The honest value for a patient the console invents is therefore none, and the api's
 * `@NotNull` now refuses the POST that used to succeed. Do not fabricate one to make a
 * sample look complete: an `accountId` that matches no account is a join key that
 * silently matches nothing, which is the defect this field exists to close.
 */
export const sampleWithNewData: NewPatient = {
  status: 'UNDER_REVIEW',
  joinedOn: dayjs('2023-12-10'),
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
