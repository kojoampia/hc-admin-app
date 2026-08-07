import dayjs from 'dayjs/esm';

import { IOrganisation, NewOrganisation } from './organisation.model';

export const sampleWithRequiredData: IOrganisation = {
  id: 15652,
  name: 'finally next',
  legalName: 'blah',
};

export const sampleWithPartialData: IOrganisation = {
  id: 31678,
  name: 'er deeply wherever',
  legalName: 'overreact shoulder exacerbate',
  registrationNumber: 'private shout',
  tin: 'yowza',
  switchboard: 'once once',
};

export const sampleWithFullData: IOrganisation = {
  id: 3664,
  name: 'bonfire',
  legalName: 'for',
  description: 'entrench vein',
  registrationNumber: 'subtract',
  tin: 'furiously after',
  foundedOn: dayjs('2023-12-11'),
  switchboard: 'scare doubtfully mild',
  email: 'travel underneath',
  deskHours: 'than drat',
};

export const sampleWithNewData: NewOrganisation = {
  name: 'humble',
  legalName: 'boohoo finer',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
