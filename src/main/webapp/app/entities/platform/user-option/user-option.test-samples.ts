import { IUserOption, NewUserOption } from './user-option.model';

export const sampleWithRequiredData: IUserOption = {
  id: 'db8519a7-6850-404f-bccd-f809f8ca4f6b',
  category: 'bah',
  userRef: 'fumigate numb',
};

export const sampleWithPartialData: IUserOption = {
  id: 'e6314242-373d-4025-9430-4f076b19cc01',
  category: 'circa',
  userRef: 'while midst',
  metadata: 'than expostulate aboard',
};

export const sampleWithFullData: IUserOption = {
  id: '169c4fe7-8d42-4108-9985-40866acb6417',
  category: 'astride',
  userRef: 'agitated',
  metadata: 'awkwardly embarrassment',
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
