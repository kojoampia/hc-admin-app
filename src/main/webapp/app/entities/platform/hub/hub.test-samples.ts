import { IHub, NewHub } from './hub.model';

export const sampleWithRequiredData: IHub = {
  id: '7e05446c-0df7-43d5-a3cd-dd9559d3752c',
  name: 'exaggerate an edible',
};

export const sampleWithPartialData: IHub = {
  id: 'cf09d4df-e1e5-4cdc-98dc-57700134a21b',
  name: 'case kookily monthly',
  staffCount: 4066,
};

export const sampleWithFullData: IHub = {
  id: '41498990-2f2a-45bb-94fd-bd20b5094335',
  name: 'burdensome',
  staffCount: 23664,
};

export const sampleWithNewData: NewHub = {
  name: 'though',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
