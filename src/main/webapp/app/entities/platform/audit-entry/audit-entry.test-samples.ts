import dayjs from 'dayjs/esm';

import { IAuditEntry } from './audit-entry.model';

export const sampleWithRequiredData: IAuditEntry = {
  id: 31156,
  occurredAt: dayjs('2023-12-11T17:14'),
  actor: 'pish before',
  action: 'graffiti whoever greedily',
  level: 'WARN',
};

export const sampleWithPartialData: IAuditEntry = {
  id: 22753,
  occurredAt: dayjs('2023-12-11T11:42'),
  actor: 'within the quintuple',
  action: 'ditch nudge or',
  target: 'supposing impartial worth',
  level: 'WARN',
};

export const sampleWithFullData: IAuditEntry = {
  id: 12004,
  occurredAt: dayjs('2023-12-11T02:39'),
  actor: 'mechanic meadow authentic',
  action: 'uselessly',
  target: 'nougat delightfully',
  level: 'WARN',
};
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
