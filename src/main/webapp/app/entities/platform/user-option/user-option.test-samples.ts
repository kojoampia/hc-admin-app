import { IUserOption, NewUserOption } from './user-option.model';

export const sampleWithRequiredData: IUserOption = {
  id: 27184,
  category: 'kindheartedly whenever ick',
  userRef: 'unknown although',
};

export const sampleWithPartialData: IUserOption = {
  id: 29720,
  category: 'courtroom behind',
  userRef: 'when',
  metadata: 'cheerfully',
};

export const sampleWithFullData: IUserOption = {
  id: 3103,
  category: 'like than',
  userRef: 'bah hm',
  metadata: 'astride',
};

export const sampleWithNewData: NewUserOption = {
  category: 'tensely',
  userRef: 'how',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
