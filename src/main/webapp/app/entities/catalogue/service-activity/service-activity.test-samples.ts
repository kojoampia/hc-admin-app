import { IServiceActivity, NewServiceActivity } from './service-activity.model';

export const sampleWithRequiredData: IServiceActivity = {
  id: '0fe1274b-e13b-42eb-a84a-1dd53ebe36cf',
  name: 'especially scruple positively',
  unit: 'oof',
  unitPrice: 2945.66,
  published: false,
};

export const sampleWithPartialData: IServiceActivity = {
  id: 'dcb034bd-9e43-4020-afef-a45eec50424b',
  name: 'hm strictly sauerkraut',
  unit: 'fictionalize knavishly blowgun',
  unitPrice: 9648.33,
  published: false,
};

export const sampleWithFullData: IServiceActivity = {
  id: 'b942b5d0-fe2c-4833-907d-58be243c3217',
  name: 'when',
  unit: 'following flawless',
  unitPrice: 2515.01,
  duration: 'cinch mmm unfurl',
  published: true,
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
