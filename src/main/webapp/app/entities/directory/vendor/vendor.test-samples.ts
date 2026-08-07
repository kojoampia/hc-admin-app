import dayjs from 'dayjs/esm';

import { IVendor, NewVendor } from './vendor.model';

export const sampleWithRequiredData: IVendor = {
  id: '087b470a-c90d-4ef9-8fc4-5e718fbda2a6',
  name: 'after wherever psst',
  category: 'respectful amongst',
  status: 'UNDER_REVIEW',
};

export const sampleWithPartialData: IVendor = {
  id: '5bfffc52-6dfb-46f8-8752-f9fa982ecbe3',
  name: 'governance unless',
  category: 'phooey',
  serviceSummary: 'blank wildly',
  status: 'ACTIVE',
  contractNote: 'upbeat sashay helpfully',
  contractRenewsOn: dayjs('2023-12-11'),
  orderCount: 2484,
};

export const sampleWithFullData: IVendor = {
  id: 'b9cc4968-2902-4c8d-bbd6-307b229f6bf2',
  name: 'insert',
  category: 'ugh till',
  serviceSummary: 'lay intently',
  contactName: 'oh customise',
  phone: 'pants mmm flawless',
  email: 'viciously',
  city: 'far lively ouch',
  status: 'SUSPENDED',
  contractNote: 'scram phooey sport',
  contractRenewsOn: dayjs('2023-12-11'),
  orderCount: 4613,
  spendToDate: 23563.25,
  rating: 4.86,
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
