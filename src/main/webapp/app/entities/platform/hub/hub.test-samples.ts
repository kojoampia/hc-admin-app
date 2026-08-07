import { IHub, NewHub } from './hub.model';

export const sampleWithRequiredData: IHub = {
  id: 15563,
  name: 'atomize eventually incidentally',
};

export const sampleWithPartialData: IHub = {
  id: 25744,
  name: 'tough mooch after',
  staffCount: 3962,
};

export const sampleWithFullData: IHub = {
  id: 9229,
  name: 'anti',
  staffCount: 32223,
};

export const sampleWithNewData: NewHub = {
  name: 'though',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
