import dayjs from 'dayjs/esm';

import { IOrganisation, NewOrganisation } from './organisation.model';

export const sampleWithRequiredData: IOrganisation = {
  id: '7a2100a0-377f-4e60-b904-54b581f865af',
  name: 'ouch',
  legalName: 'memorable meh',
};

export const sampleWithPartialData: IOrganisation = {
  id: 'fc032981-e812-4911-a220-1239ded984f6',
  name: 'representation presell',
  legalName: 'shoddy amid yowza',
  registrationNumber: 'once once',
  tin: 'task',
  switchboard: 'around midst despite',
};

export const sampleWithFullData: IOrganisation = {
  id: '126f2b88-1233-4be7-8036-3669e54075d0',
  name: 'tomorrow yet before',
  legalName: 'utterly until less',
  description: 'heavy so able',
  registrationNumber: 'how saloon',
  tin: 'whether',
  foundedOn: dayjs('2023-12-11'),
  switchboard: 'meh',
  email: 'jealously',
  deskHours: 'knowingly geez',
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
