import { IServicePlan, NewServicePlan } from './service-plan.model';

export const sampleWithRequiredData: IServicePlan = {
  id: 28333,
  name: 'molasses',
  tier: 'ESSENTIAL',
  monthlyPrice: 5092.51,
  currency: 'boo',
  featured: false,
};

export const sampleWithPartialData: IServicePlan = {
  id: 10050,
  name: 'unexpectedly',
  tier: 'PLUS',
  monthlyPrice: 16367.1,
  currency: 'goa',
  summary: 'knuckle',
  featured: false,
  subscriberCount: 30628,
};

export const sampleWithFullData: IServicePlan = {
  id: 27283,
  name: 'sequester',
  tier: 'ESSENTIAL',
  tierLabel: 'towards huzzah prejudge',
  monthlyPrice: 13009.57,
  currency: 'kin',
  summary: 'deployment hm',
  featured: false,
  subscriberCount: 24526,
};

export const sampleWithNewData: NewServicePlan = {
  name: 'helpless willow',
  tier: 'FAMILY',
  monthlyPrice: 12137.28,
  currency: 'zea',
  featured: false,
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
