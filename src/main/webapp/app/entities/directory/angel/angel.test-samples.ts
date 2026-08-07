import { IAngel, NewAngel } from './angel.model';

export const sampleWithRequiredData: IAngel = {
  id: 32336,
  name: 'shark yum encouragement',
  relationship: 'towards',
  phone: 'supposing aha',
};

export const sampleWithPartialData: IAngel = {
  id: 5088,
  name: 'carefree lovable uh-huh',
  relationship: 'soupy',
  phone: 'whoa',
  country: 'wiggly',
};

export const sampleWithFullData: IAngel = {
  id: 13922,
  name: 'publicity',
  relationship: 'impact gnaw',
  phone: 'word',
  email: 'forswear',
  country: 'per',
};

export const sampleWithNewData: NewAngel = {
  name: 'yuck',
  relationship: 'inasmuch fuss hope',
  phone: 'crossly',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
