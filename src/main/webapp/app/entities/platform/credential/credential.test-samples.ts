import dayjs from 'dayjs/esm';

import { ICredential, NewCredential } from './credential.model';

export const sampleWithRequiredData: ICredential = {
  id: '751a530f-4678-4946-8e32-2bebd823c75d',
  email: 'towards elegantly unaware',
  role: 'ROLE_PROFESSIONAL',
  enabled: false,
};

export const sampleWithPartialData: ICredential = {
  id: '22a28629-695f-4176-9b0d-075f6c86c444',
  email: 'fatally huddle',
  role: 'ROLE_ADMIN',
  enabled: true,
};

export const sampleWithFullData: ICredential = {
  id: '5e0607ea-e22a-4c24-94fe-18e9bbea340f',
  email: 'while',
  phoneNumber: 'underneath till',
  passwordHash: 'metallic burly gently',
  role: 'ROLE_USER',
  enabled: true,
  lastLoginAt: dayjs('2023-12-11T05:00'),
};

export const sampleWithNewData: NewCredential = {
  email: 'jell fax meh',
  role: 'ROLE_VENDOR',
  enabled: true,
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
