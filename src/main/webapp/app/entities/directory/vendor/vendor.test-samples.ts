import dayjs from 'dayjs/esm';

import { IVendor, NewVendor } from './vendor.model';

export const sampleWithRequiredData: IVendor = {
  id: 130,
  name: 'whereas within',
  category: 'via broadly how',
  status: 'ACTIVE',
};

export const sampleWithPartialData: IVendor = {
  id: 11631,
  name: 'lest lovable next',
  category: 'culture redound',
  serviceSummary: 'unless blah',
  status: 'ACTIVE',
  contractNote: 'blank wildly',
  contractRenewsOn: dayjs('2023-12-10'),
  orderCount: 29977,
};

export const sampleWithFullData: IVendor = {
  id: 24347,
  name: 'dental pronoun',
  category: 'huzzah testify per',
  serviceSummary: 'direct now',
  contactName: 'pasta beloved via',
  phone: 'boohoo prohibition becau',
  email: 'stunning but unsung',
  city: 'um willow among',
  status: 'SUSPENDED',
  contractNote: 'why request flint',
  contractRenewsOn: dayjs('2023-12-11'),
  orderCount: 20144,
  spendToDate: 16507.78,
  rating: 1.84,
};

export const sampleWithNewData: NewVendor = {
  name: 'wrongly motionless',
  category: 'before hearten off',
  status: 'ON_LEAVE',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
