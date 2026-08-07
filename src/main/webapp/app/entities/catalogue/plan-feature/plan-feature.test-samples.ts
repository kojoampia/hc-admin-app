import { IPlanFeature, NewPlanFeature } from './plan-feature.model';

export const sampleWithRequiredData: IPlanFeature = {
  id: 'd3d1e3a3-15ab-45ad-bebd-95d720ccd3fc',
  label: 'at construe',
  position: 25354,
};

export const sampleWithPartialData: IPlanFeature = {
  id: 'cbc7b89d-3edd-49af-a0b5-90aa8755c4aa',
  label: 'before though gosh',
  position: 9553,
};

export const sampleWithFullData: IPlanFeature = {
  id: 'd18577cb-d8e9-45ab-a44c-115f6c33fc80',
  label: 'optimistically once gee',
  position: 18164,
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
