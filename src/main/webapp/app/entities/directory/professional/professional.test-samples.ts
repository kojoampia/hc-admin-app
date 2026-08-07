import dayjs from 'dayjs/esm';

import { IProfessional, NewProfessional } from './professional.model';

export const sampleWithRequiredData: IProfessional = {
  id: 16110,
  role: 'CAREGIVER',
  licenceNumber: 'whine frizz hourly',
  verification: 'REJECTED',
  status: 'SUSPENDED',
  joinedOn: dayjs('2023-12-11'),
};

export const sampleWithPartialData: IProfessional = {
  id: 5137,
  role: 'CAREGIVER',
  licenceNumber: 'unless',
  verification: 'VERIFIED',
  status: 'ON_LEAVE',
  visitCount: 1599,
  rating: 3,
  joinedOn: dayjs('2023-12-10'),
};

export const sampleWithFullData: IProfessional = {
  id: 7191,
  role: 'DOCTOR',
  speciality: 'times victoriously',
  licenceNumber: 'cop-out kiddingly',
  verification: 'REJECTED',
  status: 'UNDER_REVIEW',
  patientCount: 27497,
  caseCount: 4026,
  visitCount: 32762,
  rating: 1.69,
  joinedOn: dayjs('2023-12-11'),
};

export const sampleWithNewData: NewProfessional = {
  role: 'CAREGIVER',
  licenceNumber: 'sushi yum shout',
  verification: 'VERIFIED',
  status: 'PENDING',
  joinedOn: dayjs('2023-12-11'),
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
