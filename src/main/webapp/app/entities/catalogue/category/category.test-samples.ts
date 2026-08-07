import { ICategory, NewCategory } from './category.model';

export const sampleWithRequiredData: ICategory = {
  id: 8109,
  name: 'midst croon cautiously',
};

export const sampleWithPartialData: ICategory = {
  id: 7001,
  name: 'mmm summarise far',
  description: 'following readily excited',
  iconKey: 'though expansion',
};

export const sampleWithFullData: ICategory = {
  id: 28780,
  name: 'ouch',
  description: 'self-confidence',
  iconKey: 'because cheap',
};

export const sampleWithNewData: NewCategory = {
  name: 'where pfft regularly',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
