import { ITeam, NewTeam } from './team.model';

export const sampleWithRequiredData: ITeam = {
  id: 'f669f9ce-8faf-40b2-bd92-59c77342ae68',
  name: 'frilly',
};

export const sampleWithPartialData: ITeam = {
  id: '3bcaa8b9-69d0-4fad-ac07-5c18c5e25089',
  name: 'wearily',
  description: 'punctually ostrich',
};

export const sampleWithFullData: ITeam = {
  id: '9b2e8d30-ed7e-4eee-9f9c-7afff9d63854',
  name: 'dead',
  description: 'or',
};

export const sampleWithNewData: NewTeam = {
  name: 'unfreeze instructive waver',
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
