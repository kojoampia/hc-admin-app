import { ITeam, NewTeam } from './team.model';

export const sampleWithRequiredData: ITeam = {
  id: 31463,
  name: 'mysterious triumphantly',
};

export const sampleWithPartialData: ITeam = {
  id: 6584,
  name: 'impeccable shear sans',
  description: 'mmm',
};

export const sampleWithFullData: ITeam = {
  id: 19481,
  name: 'upwardly well-lit wide',
  description: 'less phew',
};

export const sampleWithNewData: NewTeam = {
  name: 'unfreeze instructive waver',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
