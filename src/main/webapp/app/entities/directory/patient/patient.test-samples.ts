import dayjs from 'dayjs/esm';

import { IPatient, NewPatient } from './patient.model';

export const sampleWithRequiredData: IPatient = {
  id: 2514,
  status: 'ON_LEAVE',
  joinedOn: dayjs('2023-12-11'),
};

export const sampleWithPartialData: IPatient = {
  id: 20184,
  status: 'PENDING',
  joinedOn: dayjs('2023-12-11'),
  lastActiveOn: dayjs('2023-12-11'),
  caseCount: 5584,
};

export const sampleWithFullData: IPatient = {
  id: 9819,
  status: 'ACTIVE',
  joinedOn: dayjs('2023-12-11'),
  lastActiveOn: dayjs('2023-12-11'),
  caseCount: 22548,
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
