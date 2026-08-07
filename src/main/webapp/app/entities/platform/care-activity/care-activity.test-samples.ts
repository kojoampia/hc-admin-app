import dayjs from 'dayjs/esm';

import { ICareActivity, NewCareActivity } from './care-activity.model';

export const sampleWithRequiredData: ICareActivity = {
  id: 'f20f27af-1b08-41bf-94e0-fc891e50138f',
  name: 'unit whoa opposite',
  occurredOn: dayjs('2023-12-11'),
};

export const sampleWithPartialData: ICareActivity = {
  id: 'a9b3a5a8-bd0e-409e-aef7-24bcb3ca7b38',
  name: 'aggravating',
  occurredOn: dayjs('2023-12-11'),
};

export const sampleWithFullData: ICareActivity = {
  id: 'c24b30c6-7727-4761-be70-8f9319bca79a',
  name: 'ah',
  description: 'joyously triumphantly while',
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
