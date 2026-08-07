import dayjs from 'dayjs/esm';

import { IProfile, NewProfile } from './profile.model';

export const sampleWithRequiredData: IProfile = {
  id: '93b3b7f0-e241-48b2-be0d-5215a59c1f97',
  accountId: 'cuddly like',
  firstName: 'behind cleverly why',
  lastName: 'tidy highly',
  dateOfBirth: dayjs('2023-12-11'),
  sex: 'MALE',
  mobilePhone: 'healthily boyfriend er',
  email: 'WP=L1}@i+.:$G4Wo',
  idType: 'GHANA_CARD',
  idNumber: 'reconstitute kiddingly considering',
};

export const sampleWithPartialData: IProfile = {
  id: 'bd9e18c9-d32d-40c4-941f-93e6a7a3c620',
  accountId: 'crank um',
  title: 'MS',
  firstName: 'tennis incidentally reconsideration',
  middleName: 'behind pish',
  lastName: 'devastation',
  dateOfBirth: dayjs('2023-12-11'),
  sex: 'MALE',
  mobilePhone: 'geez leap',
  email: 's>9J@-.$^d+5/',
  idType: 'PASSPORT',
  idNumber: 'pfft afore',
};

export const sampleWithFullData: IProfile = {
  id: 'e4528582-c76e-41ab-bab6-3b2ccd139d88',
  accountId: 'cavernous inure powerfully',
  title: 'DR',
  firstName: 'purse after gee',
  middleName: 'equally',
  lastName: 'skyscraper spear yahoo',
  dateOfBirth: dayjs('2023-12-11'),
  sex: 'MALE',
  mobilePhone: 'gosh now overvalue',
  email: 'z6@`bUA.|T^2',
  idType: 'PASSPORT',
  idNumber: 'but extroverted',
};

export const sampleWithNewData: NewProfile = {
  accountId: 'who abaft of',
  firstName: 'thin heavily',
  lastName: 'gripper neatly beside',
  dateOfBirth: dayjs('2023-12-10'),
  sex: 'FEMALE',
  mobilePhone: 'indeed accurate',
  email: 'hY!@Z.y]87',
  idType: 'PASSPORT',
  idNumber: 'overfeed forenenst innocent',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
