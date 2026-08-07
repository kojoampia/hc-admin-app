import { ICategory, NewCategory } from './category.model';

export const sampleWithRequiredData: ICategory = {
  id: '3f6853fc-9968-4423-8381-fa32179cf059',
  name: 'warped',
};

export const sampleWithPartialData: ICategory = {
  id: '3bafe647-b0cf-4ef8-9e40-ccf33b037902',
  name: 'indeed',
  description: 'upliftingly sense',
  iconKey: 'jive consequently',
};

export const sampleWithFullData: ICategory = {
  id: 'e30493ab-c428-4aa1-bcc5-8eb30a1baaec',
  name: 'incidentally',
  description: 'truthfully conservative hmph',
  iconKey: 'starboard operating indeed',
};

export const sampleWithNewData: NewCategory = {
  name: 'where pfft regularly',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
