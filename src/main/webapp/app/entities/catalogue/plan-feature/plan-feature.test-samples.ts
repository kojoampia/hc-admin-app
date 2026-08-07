import { IPlanFeature, NewPlanFeature } from './plan-feature.model';

export const sampleWithRequiredData: IPlanFeature = {
  id: 26854,
  label: 'before',
  position: 10940,
};

export const sampleWithPartialData: IPlanFeature = {
  id: 25939,
  label: 'downright agitated ugh',
  position: 15068,
};

export const sampleWithFullData: IPlanFeature = {
  id: 27410,
  label: 'sugary',
  position: 17374,
};

export const sampleWithNewData: NewPlanFeature = {
  label: 'hm machine maroon',
  position: 10165,
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
