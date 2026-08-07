import { IAngel, NewAngel } from './angel.model';

export const sampleWithRequiredData: IAngel = {
  id: 'fe603d41-c5cf-4635-b48f-3eb440f7fc3d',
  name: 'supposing aha',
  relationship: 'geez cap perfectly',
  phone: 'tomorrow oh',
};

export const sampleWithPartialData: IAngel = {
  id: '2f245f68-167f-4c5e-b7e4-5547d3e4d4af',
  name: 'whoa',
  relationship: 'wiggly',
  phone: 'an',
  country: 'even',
};

export const sampleWithFullData: IAngel = {
  id: '62efb624-b708-431d-8473-1bff5612e639',
  name: 'yahoo dividend tenderly',
  relationship: 'whose cow',
  phone: 'before glass per',
  email: 'intently worriedly since',
  country: 'graceful bah',
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
