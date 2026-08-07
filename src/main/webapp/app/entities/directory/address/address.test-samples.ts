import { IAddress, NewAddress } from './address.model';

export const sampleWithRequiredData: IAddress = {
  id: 2568,
  digitalAddress: 'ML-373-5701',
  streetAddress: 'aboard',
  cityState: 'yuck forenenst',
  region: 'ownership pace',
  country: 'what mountain',
};

export const sampleWithPartialData: IAddress = {
  id: 18282,
  digitalAddress: 'PR-067-0756',
  streetAddress: 'aboard trial never',
  townDistrict: 'for',
  cityState: 'monumental joy',
  region: 'yet warming deselect',
  country: 'like',
};

export const sampleWithFullData: IAddress = {
  id: 16440,
  digitalAddress: 'QE-285-1674',
  streetAddress: 'hmph colorful',
  townDistrict: 'under qua',
  cityState: 'hmph blah',
  region: 'sans opposite',
  country: 'though',
};

export const sampleWithNewData: NewAddress = {
  digitalAddress: 'TC-150-4886',
  streetAddress: 'intermix corrupt jaggedly',
  cityState: 'inventory aware',
  region: 'supposing sore',
  country: 'untimely fast guard',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
