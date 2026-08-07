import { IAddress, NewAddress } from './address.model';

export const sampleWithRequiredData: IAddress = {
  id: '1765b58b-0341-4b86-84d0-7a3416c09633',
  digitalAddress: 'YM-419-2971',
  streetAddress: 'pace schedule',
  cityState: 'mountain fuzzy judicious',
  region: 'whether outgoing schedule',
  country: 'starboard',
};

export const sampleWithPartialData: IAddress = {
  id: '89a1ac1b-9bd5-4371-8e50-02ed8cebb784',
  digitalAddress: 'ND-176-4181',
  streetAddress: 'monumental joy',
  townDistrict: 'yet warming deselect',
  cityState: 'like',
  region: 'volunteer inasmuch',
  country: 'while ponder violently',
};

export const sampleWithFullData: IAddress = {
  id: '8924d93a-c664-4222-a9fd-a7bcd925bafb',
  digitalAddress: 'LW-851-1977',
  streetAddress: 'hmph blah',
  townDistrict: 'sans opposite',
  cityState: 'though',
  region: 'but',
  country: 'across',
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
