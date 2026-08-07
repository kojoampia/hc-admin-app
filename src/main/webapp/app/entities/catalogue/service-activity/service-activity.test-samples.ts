import { IServiceActivity, NewServiceActivity } from './service-activity.model';

export const sampleWithRequiredData: IServiceActivity = {
  id: 873,
  name: 'whoever mallard crystallize',
  unit: 'plump lest following',
  unitPrice: 25464.49,
  published: false,
};

export const sampleWithPartialData: IServiceActivity = {
  id: 27718,
  name: 'numeracy unit ultimate',
  unit: 'reschedule why carefully',
  unitPrice: 25459.07,
  published: false,
};

export const sampleWithFullData: IServiceActivity = {
  id: 23108,
  name: 'vibraphone aboard',
  unit: 'enrich during',
  unitPrice: 9646.81,
  duration: 'though',
  published: false,
};

export const sampleWithNewData: NewServiceActivity = {
  name: 'kissingly',
  unit: 'er',
  unitPrice: 8732.61,
  published: false,
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
