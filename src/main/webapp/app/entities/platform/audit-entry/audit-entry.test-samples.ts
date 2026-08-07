import dayjs from 'dayjs/esm';

import { IAuditEntry } from './audit-entry.model';

export const sampleWithRequiredData: IAuditEntry = {
  id: 'fe55f06d-2e74-40d9-821b-28b4116c9ae7',
  occurredAt: dayjs('2023-12-11T18:31'),
  actor: 'silently besides',
  action: 'inasmuch mentor',
  level: 'INFO',
};

export const sampleWithPartialData: IAuditEntry = {
  id: 'baba7308-1fbb-4532-a2c1-9a77baf17bd8',
  occurredAt: dayjs('2023-12-11T02:09'),
  actor: 'unlike rosy supposing',
  action: 'aha',
  target: 'usable vice gadzooks',
  level: 'WARN',
};

export const sampleWithFullData: IAuditEntry = {
  id: '54b49c73-0954-40bf-8a83-c5f7d04409db',
  occurredAt: dayjs('2023-12-11T17:28'),
  actor: 'nougat delightfully',
  action: 'cumbersome cork schedule',
  target: 'bourgeoisie mortise',
  level: 'INFO',
};
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
