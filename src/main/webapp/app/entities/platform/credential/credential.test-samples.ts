import dayjs from 'dayjs/esm';

import { ICredential, NewCredential } from './credential.model';

export const sampleWithRequiredData: ICredential = {
  id: 14497,
  email: 'how upwardly',
  role: 'SUPERVISOR',
  enabled: true,
};

export const sampleWithPartialData: ICredential = {
  id: 4339,
  email: 'innovate',
  role: 'PROFESSIONAL',
  enabled: true,
};

export const sampleWithFullData: ICredential = {
  id: 11030,
  email: 'tomography emerge popularity',
  phoneNumber: 'nor shakily widow',
  passwordHash: 'quizzically strictly humble',
  role: 'PROFESSIONAL',
  enabled: true,
  lastLoginAt: dayjs('2023-12-11T18:53'),
};

export const sampleWithNewData: NewCredential = {
  email: 'jell fax meh',
  role: 'VENDOR',
  enabled: true,
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
