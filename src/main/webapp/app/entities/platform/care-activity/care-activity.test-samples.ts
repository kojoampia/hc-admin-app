import dayjs from 'dayjs/esm';

import { ICareActivity, NewCareActivity } from './care-activity.model';

export const sampleWithRequiredData: ICareActivity = {
  id: 32750,
  name: 'cap',
  occurredOn: dayjs('2023-12-11'),
};

export const sampleWithPartialData: ICareActivity = {
  id: 22431,
  name: 'sentimental pish',
  occurredOn: dayjs('2023-12-11'),
};

export const sampleWithFullData: ICareActivity = {
  id: 25702,
  name: 'given',
  description: 'intent poorly',
  occurredOn: dayjs('2023-12-11'),
};

export const sampleWithNewData: NewCareActivity = {
  name: 'sleepy hm except',
  occurredOn: dayjs('2023-12-11'),
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
