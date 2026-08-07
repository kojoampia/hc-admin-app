import dayjs from 'dayjs/esm';

import { IPatient, NewPatient } from './patient.model';

export const sampleWithRequiredData: IPatient = {
  id: '1b675df3-31ea-404e-b43c-e3a1e4dd1ad7',
  status: 'PENDING',
  joinedOn: dayjs('2023-12-10'),
};

export const sampleWithPartialData: IPatient = {
  id: '95732895-7b6b-4869-9787-5d89b002be37',
  status: 'UNDER_REVIEW',
  joinedOn: dayjs('2023-12-11'),
  lastActiveOn: dayjs('2023-12-11'),
  caseCount: 21451,
};

export const sampleWithFullData: IPatient = {
  id: '43abbb77-2599-407f-8e96-bde90617b39b',
  status: 'ACTIVE',
  joinedOn: dayjs('2023-12-10'),
  lastActiveOn: dayjs('2023-12-11'),
  caseCount: 8959,
};

export const sampleWithNewData: NewPatient = {
  status: 'UNDER_REVIEW',
  joinedOn: dayjs('2023-12-10'),
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
