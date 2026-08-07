import dayjs from 'dayjs/esm';

import { IProfile, NewProfile } from './profile.model';

export const sampleWithRequiredData: IProfile = {
  id: 18889,
  firstName: 'transparency',
  lastName: 'oh',
  dateOfBirth: dayjs('2023-12-11'),
  sex: 'MALE',
  mobilePhone: 'bliss',
  email: '[NnIq7@\\|j."',
  idType: 'VOTER_ID',
  idNumber: 'supportive antagonize if',
};

export const sampleWithPartialData: IProfile = {
  id: 23204,
  title: 'PROF',
  firstName: 'astride charter',
  middleName: 'that pace crank',
  lastName: 'metal phooey',
  dateOfBirth: dayjs('2023-12-11'),
  sex: 'MALE',
  mobilePhone: 'aw',
  email: '6BbfK@M.t/z;&',
  idType: 'DRIVERS_LICENCE',
  idNumber: 'hotfoot',
};

export const sampleWithFullData: IProfile = {
  id: 29727,
  title: 'MRS',
  firstName: 'failing pulse',
  middleName: 'afore specific',
  lastName: 'obedience throughout gee',
  dateOfBirth: dayjs('2023-12-11'),
  sex: 'MALE',
  mobilePhone: 'whereas etch that',
  email: 'S0e@3x.QL',
  idType: 'PASSPORT',
  idNumber: 'fervently once',
};

export const sampleWithNewData: NewProfile = {
  firstName: 'who abaft of',
  lastName: 'thin heavily',
  dateOfBirth: dayjs('2023-12-11'),
  sex: 'FEMALE',
  mobilePhone: 'oh now',
  email: 'NZ@>!|.S:z',
  idType: 'PASSPORT',
  idNumber: 'mmm',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
