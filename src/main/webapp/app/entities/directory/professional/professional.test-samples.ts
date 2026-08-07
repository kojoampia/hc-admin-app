import dayjs from 'dayjs/esm';

import { IProfessional, NewProfessional } from './professional.model';

export const sampleWithRequiredData: IProfessional = {
  id: '72aa3c17-bf53-46c0-9e51-9e2b65b8b6e2',
  role: 'CAREGIVER',
  licenceNumber: 'memorise',
  verification: 'VERIFIED',
  status: 'PENDING',
  joinedOn: dayjs('2023-12-11'),
};

export const sampleWithPartialData: IProfessional = {
  id: '232bfe19-0b3b-4090-9116-e0f3c9673b81',
  role: 'NURSE',
  licenceNumber: 'far pillbox',
  verification: 'VERIFIED',
  status: 'SUSPENDED',
  visitCount: 12129,
  rating: 2.25,
  joinedOn: dayjs('2023-12-11'),
};

export const sampleWithFullData: IProfessional = {
  id: '3f88b707-4dfa-40c0-83ea-4fa25e379b3c',
  role: 'PARAMEDIC',
  speciality: 'indeed roasted concerning',
  licenceNumber: 'incidentally since',
  verification: 'PENDING',
  status: 'SUSPENDED',
  patientCount: 32107,
  caseCount: 435,
  visitCount: 14522,
  rating: 0.03,
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
